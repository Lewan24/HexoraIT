using System.Collections.Concurrent;
using FluentAssertions;
using HexoraITApi.Application;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace HexoraIT.Tests.Application;

public sealed class SecurityAuditLoggerTests
{
    [Fact]
    public void EventsUseStableIdsCorrelationAndDoNotContainSensitivePayloadFields()
    {
        var provider = new RecordingLoggerProvider();
        using var loggerFactory = LoggerFactory.Create(builder => builder.AddProvider(provider));
        var context = new DefaultHttpContext { TraceIdentifier = "trace-test" };
        context.Connection.RemoteIpAddress = System.Net.IPAddress.Loopback;
        var audit = new SecurityAuditLogger(
            loggerFactory,
            new HttpContextAccessor { HttpContext = context });
        var userId = Guid.NewGuid();
        var resourceId = Guid.NewGuid();
        var organizationId = Guid.NewGuid();

        audit.AuthenticationSucceeded(userId);
        audit.AccountChanged("password_changed", userId, userId);
        audit.SensitiveResourceAccessed("password_revealed", userId, resourceId, organizationId);
        audit.RequestRejected(429, "POST", "/api/auth/login", null, "trace-rejected", "127.0.0.1");

        provider.Entries.Select(entry => entry.EventId.Id).Should()
            .BeEquivalentTo(new[] { 1001, 1101, 1201, 1901 });
        provider.Entries.Should().AllSatisfy(entry =>
        {
            entry.Message.Should().NotContain("Password=");
            entry.Message.Should().NotContain("Token=");
            entry.Message.Should().NotContain("Body=");
            entry.Message.Should().NotContain("Query=");
            entry.Message.Should().NotContain("Email=");
        });
        provider.Entries.Single(entry => entry.EventId.Id == 1001).Message.Should().Contain("trace-test");
        provider.Entries.Single(entry => entry.EventId.Id == 1901).Message.Should().Contain("trace-rejected");
    }

    private sealed record LogEntry(EventId EventId, string Message);

    private sealed class RecordingLoggerProvider : ILoggerProvider
    {
        public ConcurrentBag<LogEntry> Entries { get; } = [];

        public ILogger CreateLogger(string categoryName) => new RecordingLogger(Entries);

        public void Dispose() { }

        private sealed class RecordingLogger(ConcurrentBag<LogEntry> entries) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(
                LogLevel logLevel,
                EventId eventId,
                TState state,
                Exception? exception,
                Func<TState, Exception?, string> formatter) =>
                entries.Add(new LogEntry(eventId, formatter(state, exception)));
        }
    }
}

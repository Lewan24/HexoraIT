using HexoraITApi.Application;

namespace HexoraIT.Tests.Fakes;

public sealed class FakeEmailSender : IEmailSender
{
    public List<(string Recipient, string Subject, string Body)> Messages { get; } = [];
    public bool Succeeds { get; set; } = true;
    public Task<bool> SendAsync(string recipient, string subject, string textBody, CancellationToken token = default)
    {
        Messages.Add((recipient, subject, textBody));
        return Task.FromResult(Succeeds);
    }
}

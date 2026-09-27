using AutoMapper;
using AutoMapper.QueryableExtensions;
using FluentAssertions;
using HexoraIT.Tests.Fakes;
using HexoraITApi.Domain;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HexoraIT.Tests.Application;

public sealed class PostgreSqlQueryTranslationTests
{
    [Fact]
    public void ProductionProvider_TranslatesServiceListProjectionsWithoutConnectingToDatabase()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=127.0.0.1;Database=translation_only;Username=translation_only;Password=translation_only")
            .Options;
        using var db = new AppDbContext(options, new FakeCurrentUserIdProvider { UserId = Guid.NewGuid() });
        var mapperConfiguration = new MapperConfiguration(
            configuration => configuration.AddProfile<AppMappingProfile>(),
            new LoggerFactory());

        var queries = new (string Name, IQueryable Query)[]
        {
            ("admin users", db.Users
                .Select(user => new { user.Id, user.Email, user.DisplayName, user.SystemRole, user.IsBlocked, user.CreatedAt })),
            ("organization summaries", db.UserOrganizations
                .Select(item => new { item.OrganizationId, item.Organization.Name, item.Role })),
            ("organization members", db.UserOrganizations
                .Select(item => new OrgMemberDto(item.UserId, item.User.Email, item.User.DisplayName, item.Role,
                    item.CustomRoleId, item.CustomRole == null ? null : item.CustomRole.Name, item.User.SystemRole))),
            ("assets", db.Assets.ProjectTo<AssetDto>(mapperConfiguration)),
            ("passwords", db.Passwords.ProjectTo<PasswordListDto>(mapperConfiguration)),
            ("subnets", db.Subnets.ProjectTo<SubnetDto>(mapperConfiguration)),
            ("licenses", db.Licenses.ProjectTo<LicenseDto>(mapperConfiguration)),
            ("contacts", db.Contacts.ProjectTo<ContactDto>(mapperConfiguration)),
            ("plans", db.Plans.ProjectTo<PlanDto>(mapperConfiguration)),
            ("incidents", db.Incidents.ProjectTo<IncidentDto>(mapperConfiguration)),
            ("knowledge", db.KnowledgeArticles.ProjectTo<KnowledgeArticleDto>(mapperConfiguration)),
            ("projects", db.Projects.ProjectTo<ProjectDto>(mapperConfiguration)),
            ("tasks", db.Tasks.ProjectTo<WorkTaskDto>(mapperConfiguration)),
            ("groups", db.Groups.ProjectTo<GroupDto>(mapperConfiguration)),
            ("folders", db.FileFolders.ProjectTo<FileFolderDto>(mapperConfiguration)),
            ("files", db.StoredFiles.ProjectTo<StoredFileDto>(mapperConfiguration)),
            ("private notes", db.PrivateNotes.Select(note => new { note.Id, note.Title, note.Content, note.UpdatedAt }))
        };

        foreach (var (name, query) in queries)
        {
            var translate = () => query.ToQueryString();
            translate.Should().NotThrow($"the {name} service query must be translatable by PostgreSQL");
            translate().Should().Contain("SELECT");
        }
    }
}

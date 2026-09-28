using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IClientReportService
{
    Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateClientReportDto dto, CancellationToken token = default);
}

public sealed class ClientReportService(AppDbContext db, ICurrentUserContext userContext) : IClientReportService
{
    public async Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateClientReportDto dto, CancellationToken token = default)
    {
        if (!await userContext.HasAccessAsync(organizationId)) return new(StatusCodes.Status403Forbidden);
        var user = await db.Users.SingleAsync(candidate => candidate.Id == userContext.UserId, token);
        if (user.SystemRole != SystemRole.Client) return new(StatusCodes.Status403Forbidden);
        if (!Enum.IsDefined(dto.Priority) || string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Description))
            return new(StatusCodes.Status400BadRequest, "Provide a title, description and valid priority.");
        var task = new WorkTask
        {
            OrganizationId = organizationId, Title = dto.Title.Trim(), Description = dto.Description.Trim(),
            Priority = dto.Priority, Status = WorkTaskStatus.Todo, CreatedAt = DateTime.UtcNow,
            CreatedByUserId = user.Id, CreatedByName = user.DisplayName
        };
        db.Tasks.Add(task); await db.SaveChangesAsync(token);
        return new(StatusCodes.Status200OK, new ClientReportResultDto(task.Id, task.Title, task.CreatedAt));
    }
}

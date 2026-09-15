using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.App;

public record CreateClientReportDto(
    [Required, StringLength(200)] string Title,
    [Required, StringLength(100000)] string Description,
    Priority Priority);

[Authorize]
[ApiController]
[Route("api/organizations/{organizationId:guid}/reports")]
public class ClientReportsController(AppDbContext db, ICurrentUserContext context) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(Guid organizationId, CreateClientReportDto dto)
    {
        if (!await context.HasAccessAsync(organizationId)) return Forbid();
        var user = await db.Users.SingleAsync(u => u.Id == context.UserId);
        if (user.SystemRole != SystemRole.Client) return Forbid();
        if (!Enum.IsDefined(dto.Priority) || string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Description))
            return BadRequest("Provide a title, description and valid priority.");
        var task = new WorkTask
        {
            OrganizationId = organizationId, Title = dto.Title.Trim(), Description = dto.Description.Trim(),
            Priority = dto.Priority, Status = WorkTaskStatus.Todo, CreatedAt = DateTime.UtcNow,
            CreatedByUserId = user.Id, CreatedByName = user.DisplayName
        };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();
        return Ok(new { task.Id, task.Title, task.CreatedAt });
    }
}

using AutoMapper;
using HexoraITApi.Api.Auth;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.App;

[ApiController]
[Route("api/organizations")]
public class OrganizationsController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : OrgScopedController(db, userContext)
{
    private readonly ICurrentUserContext _userContext = userContext;

    [HttpGet]
    public async Task<ActionResult<List<OrganizationSummaryDto>>> GetAll()
    {
        var orgs = await Db.UserOrganizations
            .Where(uo => uo.UserId == _userContext.UserId)
            .Select(uo => new OrganizationSummaryDto(uo.OrganizationId, uo.Organization.Name, uo.Role.ToString()))
            .ToListAsync();
        return Ok(orgs);
    }

    [HttpGet("deleted")]
    public async Task<ActionResult<List<OrganizationSummaryDto>>> GetDeleted()
    {
        var orgs = await Db.UserOrganizations.IgnoreQueryFilters()
            .Where(uo => uo.UserId == _userContext.UserId && uo.Role == OrgRole.Owner && uo.Organization.IsDeleted)
            .Select(uo => new OrganizationSummaryDto(uo.OrganizationId, uo.Organization.Name, uo.Role.ToString()))
            .ToListAsync();
        return Ok(orgs);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrganizationDto>> GetById(Guid id)
    {
        var check = await CheckReadAccessAsync(id);
        if (check is not null) return check;

        var org = await Db.Organizations.FirstOrDefaultAsync(o => o.Id == id);
        return org is null ? NotFound() : Ok(mapper.Map<OrganizationDto>(org));
    }

    [HttpPost]
    public async Task<ActionResult<OrganizationDto>> Create(CreateOrganizationDto dto)
    {
        var org = mapper.Map<Organization>(dto);
        Db.Organizations.Add(org);
        Db.UserOrganizations.Add(new UserOrganization { UserId = _userContext.UserId, OrganizationId = org.Id, Role = OrgRole.Owner });
        await Db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = org.Id }, mapper.Map<OrganizationDto>(org));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateOrganizationDto dto)
    {
        var check = await CheckWriteAccessAsync(id, OrgRole.Admin);
        if (check is not null) return check;

        var org = await Db.Organizations.FirstOrDefaultAsync(o => o.Id == id);
        if (org is null) return NotFound();

        mapper.Map(dto, org);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:guid}/members")]
    public async Task<ActionResult<List<OrgMemberDto>>> GetMembers(Guid id)
    {
        var check = await CheckReadAccessAsync(id);
        if (check is not null) return check;

        var members = await Db.UserOrganizations
            .Where(uo => uo.OrganizationId == id)
            .Select(uo => new OrgMemberDto(uo.UserId, uo.User.Email, uo.User.DisplayName, uo.Role))
            .ToListAsync();
        return Ok(members);
    }

    [HttpPost("{id:guid}/members")]
    public async Task<ActionResult<OrgMemberDto>> InviteMember(Guid id, InviteMemberDto dto)
    {
        var check = await CheckWriteAccessAsync(id, OrgRole.Admin);
        if (check is not null) return check;

        if (dto.Role == OrgRole.Owner)
            return BadRequest("An organization can only have one owner. Invite as Admin or another role instead.");

        var email = dto.Email.Trim().ToLowerInvariant();
        var user = await Db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null)
            return NotFound("No registered user with that email address was found.");

        var alreadyMember = await Db.UserOrganizations.AnyAsync(uo => uo.OrganizationId == id && uo.UserId == user.Id);
        if (alreadyMember)
            return Conflict("This user is already a member of the organization.");

        Db.UserOrganizations.Add(new UserOrganization { UserId = user.Id, OrganizationId = id, Role = dto.Role });
        await Db.SaveChangesAsync();

        return Ok(new OrgMemberDto(user.Id, user.Email, user.DisplayName, dto.Role));
    }

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId)
    {
        var isSelf = userId == _userContext.UserId;
        var check = isSelf
            ? await CheckReadAccessAsync(id)
            : await CheckWriteAccessAsync(id, OrgRole.Admin);
        if (check is not null) return check;

        var membership = await Db.UserOrganizations.FirstOrDefaultAsync(uo => uo.OrganizationId == id && uo.UserId == userId);
        if (membership is null) return NotFound();

        if (membership.Role == OrgRole.Owner)
            return BadRequest(isSelf
                ? "The organization owner cannot leave. Delete the organization instead if you want to give it up."
                : "The organization owner cannot be removed.");

        if (!isSelf)
        {
            var actingRole = await _userContext.GetRoleAsync(id);
            if (actingRole != OrgRole.Owner && membership.Role >= OrgRole.Admin)
                return Forbid();
        }

        Db.UserOrganizations.Remove(membership);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var check = await CheckWriteAccessAsync(id, OrgRole.Owner);
        if (check is not null) return check;

        var org = await Db.Organizations.FirstOrDefaultAsync(o => o.Id == id);
        if (org is null) return NotFound();

        org.IsDeleted = true;
        org.DeletedAt = DateTime.UtcNow;
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> Restore(Guid id)
    {
        var org = await Db.Organizations.IgnoreQueryFilters().FirstOrDefaultAsync(o => o.Id == id);
        if (org is null) return NotFound();
        if (!org.IsDeleted) return BadRequest("Organization is not deleted.");

        var role = await Db.UserOrganizations
            .Where(uo => uo.OrganizationId == id && uo.UserId == _userContext.UserId)
            .Select(uo => (OrgRole?)uo.Role)
            .FirstOrDefaultAsync();
        if (role != OrgRole.Owner) return Forbid();

        org.IsDeleted = false;
        org.DeletedAt = null;
        await Db.SaveChangesAsync();
        return NoContent();
    }
}
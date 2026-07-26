using AutoMapper;
using AutoMapper.QueryableExtensions;
using HexoraITApi.Api.Auth;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.App;

[ApiController]
[Route("api/assets")]
public class AssetsController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<List<AssetDto>>> GetAll([FromQuery] Guid? organizationId)
    {
        if (organizationId is { } orgId)
        {
            var check = await CheckReadAccessAsync(orgId);
            if (check is not null) return check;
        }

        var query = Db.Assets.AsQueryable();
        if (organizationId is { } id) query = query.Where(a => a.OrganizationId == id);

        return Ok(await query.ProjectTo<AssetDto>(mapper.ConfigurationProvider).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AssetDto>> GetById(Guid id)
    {
        var asset = await Db.Assets.FirstOrDefaultAsync(a => a.Id == id);
        return asset is null ? NotFound() : Ok(mapper.Map<AssetDto>(asset));
    }

    [HttpPost]
    public async Task<ActionResult<AssetDto>> Create([FromQuery] Guid organizationId, CreateAssetDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        var asset = mapper.Map<Asset>(dto);
        asset.OrganizationId = organizationId;
        asset.UpdatedAt = DateTime.UtcNow;
        Db.Assets.Add(asset);
        await Db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = asset.Id }, mapper.Map<AssetDto>(asset));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateAssetDto dto)
    {
        var asset = await Db.Assets.FirstOrDefaultAsync(a => a.Id == id);
        if (asset is null) return NotFound();

        var check = await CheckWriteAccessAsync(asset.OrganizationId);
        if (check is not null) return check;

        mapper.Map(dto, asset);
        asset.UpdatedAt = DateTime.UtcNow;
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var asset = await Db.Assets.FirstOrDefaultAsync(a => a.Id == id);
        if (asset is null) return NotFound();

        var check = await CheckWriteAccessAsync(asset.OrganizationId);
        if (check is not null) return check;

        Db.Assets.Remove(asset);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:guid}/star")]
    public async Task<IActionResult> ToggleStar(Guid id)
    {
        var asset = await Db.Assets.FirstOrDefaultAsync(a => a.Id == id);
        if (asset is null) return NotFound();

        var check = await CheckWriteAccessAsync(asset.OrganizationId);
        if (check is not null) return check;

        asset.Starred = !asset.Starred;
        await Db.SaveChangesAsync();
        return Ok(new { asset.Starred });
    }
}
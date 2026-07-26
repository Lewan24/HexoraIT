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
[Route("api/subnets")]
public class SubnetsController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<List<SubnetDto>>> GetAll([FromQuery] Guid? organizationId)
    {
        if (organizationId is { } orgId)
        {
            var check = await CheckReadAccessAsync(orgId);
            if (check is not null) return check;
        }

        var query = Db.Subnets.Include(s => s.Ips).AsQueryable();
        if (organizationId is { } id) query = query.Where(s => s.OrganizationId == id);

        return Ok(await query.ProjectTo<SubnetDto>(mapper.ConfigurationProvider).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SubnetDto>> GetById(Guid id)
    {
        var subnet = await Db.Subnets.Include(s => s.Ips).FirstOrDefaultAsync(s => s.Id == id);
        return subnet is null ? NotFound() : Ok(mapper.Map<SubnetDto>(subnet));
    }

    [HttpPost]
    public async Task<ActionResult<SubnetDto>> Create([FromQuery] Guid organizationId, CreateSubnetDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        var subnet = mapper.Map<Subnet>(dto);
        subnet.OrganizationId = organizationId;
        Db.Subnets.Add(subnet);
        await Db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = subnet.Id }, mapper.Map<SubnetDto>(subnet));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateSubnetDto dto)
    {
        var subnet = await Db.Subnets.FirstOrDefaultAsync(s => s.Id == id);
        if (subnet is null) return NotFound();

        var check = await CheckWriteAccessAsync(subnet.OrganizationId);
        if (check is not null) return check;

        mapper.Map(dto, subnet);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var subnet = await Db.Subnets.FirstOrDefaultAsync(s => s.Id == id);
        if (subnet is null) return NotFound();

        var check = await CheckWriteAccessAsync(subnet.OrganizationId);
        if (check is not null) return check;

        Db.Subnets.Remove(subnet);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{subnetId:guid}/ips")]
    public async Task<ActionResult<IPEntryDto>> AddIp(Guid subnetId, CreateIPEntryDto dto)
    {
        var subnet = await Db.Subnets.FirstOrDefaultAsync(s => s.Id == subnetId);
        if (subnet is null) return NotFound();

        var check = await CheckWriteAccessAsync(subnet.OrganizationId);
        if (check is not null) return check;

        var entry = mapper.Map<IPEntry>(dto);
        entry.SubnetId = subnetId;
        Db.IPEntries.Add(entry);
        await Db.SaveChangesAsync();
        return Ok(mapper.Map<IPEntryDto>(entry));
    }

    [HttpPut("{subnetId:guid}/ips/{entryId:guid}")]
    public async Task<IActionResult> UpdateIp(Guid subnetId, Guid entryId, UpdateIPEntryDto dto)
    {
        var subnet = await Db.Subnets.FirstOrDefaultAsync(s => s.Id == subnetId);
        if (subnet is null) return NotFound();

        var check = await CheckWriteAccessAsync(subnet.OrganizationId);
        if (check is not null) return check;

        var entry = await Db.IPEntries.FirstOrDefaultAsync(ip => ip.Id == entryId && ip.SubnetId == subnetId);
        if (entry is null) return NotFound();

        mapper.Map(dto, entry);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{subnetId:guid}/ips/{entryId:guid}")]
    public async Task<IActionResult> DeleteIp(Guid subnetId, Guid entryId)
    {
        var subnet = await Db.Subnets.FirstOrDefaultAsync(s => s.Id == subnetId);
        if (subnet is null) return NotFound();

        var check = await CheckWriteAccessAsync(subnet.OrganizationId);
        if (check is not null) return check;

        var entry = await Db.IPEntries.FirstOrDefaultAsync(ip => ip.Id == entryId && ip.SubnetId == subnetId);
        if (entry is null) return NotFound();

        Db.IPEntries.Remove(entry);
        await Db.SaveChangesAsync();
        return NoContent();
    }
}
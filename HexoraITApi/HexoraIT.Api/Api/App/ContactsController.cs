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
[Route("api/contacts")]
public class ContactsController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<List<ContactDto>>> GetAll([FromQuery] Guid? organizationId)
    {
        if (organizationId is { } orgId)
        {
            var check = await CheckReadAccessAsync(orgId);
            if (check is not null) return check;
        }

        var query = Db.Contacts.AsQueryable();
        if (organizationId is { } id) query = query.Where(c => c.OrganizationId == id);

        return Ok(await query.ProjectTo<ContactDto>(mapper.ConfigurationProvider).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ContactDto>> GetById(Guid id)
    {
        var contact = await Db.Contacts.FirstOrDefaultAsync(c => c.Id == id);
        return contact is null ? NotFound() : Ok(mapper.Map<ContactDto>(contact));
    }

    [HttpPost]
    public async Task<ActionResult<ContactDto>> Create([FromQuery] Guid organizationId, CreateContactDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        var contact = mapper.Map<Contact>(dto);
        contact.OrganizationId = organizationId;
        Db.Contacts.Add(contact);
        await Db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = contact.Id }, mapper.Map<ContactDto>(contact));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateContactDto dto)
    {
        var contact = await Db.Contacts.FirstOrDefaultAsync(c => c.Id == id);
        if (contact is null) return NotFound();

        var check = await CheckWriteAccessAsync(contact.OrganizationId);
        if (check is not null) return check;

        mapper.Map(dto, contact);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var contact = await Db.Contacts.FirstOrDefaultAsync(c => c.Id == id);
        if (contact is null) return NotFound();

        var check = await CheckWriteAccessAsync(contact.OrganizationId);
        if (check is not null) return check;

        Db.Contacts.Remove(contact);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:guid}/star")]
    public async Task<IActionResult> ToggleStar(Guid id)
    {
        var contact = await Db.Contacts.FirstOrDefaultAsync(c => c.Id == id);
        if (contact is null) return NotFound();

        var check = await CheckWriteAccessAsync(contact.OrganizationId);
        if (check is not null) return check;

        contact.Starred = !contact.Starred;
        await Db.SaveChangesAsync();
        return Ok(new { contact.Starred });
    }
}
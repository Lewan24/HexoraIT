using AutoMapper;
using AutoMapper.QueryableExtensions;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IContactService
{
    Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateContactDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> UpdateAsync(Guid id, UpdateContactDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> ToggleStarAsync(Guid id, CancellationToken cancellationToken = default);
}

public sealed class ContactService(
    AppDbContext db,
    IMapper mapper,
    ICurrentUserContext userContext) : IContactService
{
    public async Task<ApiOperationResult> GetAllAsync(
        Guid? organizationId,
        PaginationParameters? pagination,
        CancellationToken cancellationToken = default)
    {
        if (!Pagination.TryResolve(pagination, out var window))
            return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        if (organizationId is { } organization &&
            !await userContext.HasPermissionAsync(organization, "contacts"))
            return new(StatusCodes.Status403Forbidden);

        var query = db.Contacts.AsQueryable();
        if (organizationId is { } id) query = query.Where(contact => contact.OrganizationId == id);
        var totalCount = await query.CountAsync(cancellationToken);
        var contacts = await query
            .OrderBy(contact => contact.Id)
            .Skip(window.Offset)
            .Take(window.PageSize)
            .ProjectTo<ContactDto>(mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);
        return new(StatusCodes.Status200OK, contacts,
            Pagination: new PaginationMetadata(totalCount, window));
    }

    public async Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var contact = await db.Contacts.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        return contact is null
            ? new(StatusCodes.Status404NotFound)
            : new(StatusCodes.Status200OK, mapper.Map<ContactDto>(contact));
    }

    public async Task<ApiOperationResult> CreateAsync(
        Guid organizationId,
        CreateContactDto dto,
        CancellationToken cancellationToken = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "contacts", write: true))
            return new(StatusCodes.Status403Forbidden);

        var contact = mapper.Map<Contact>(dto);
        contact.OrganizationId = organizationId;
        db.Contacts.Add(contact);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status201Created, mapper.Map<ContactDto>(contact), $"/api/contacts/{contact.Id}");
    }

    public async Task<ApiOperationResult> UpdateAsync(
        Guid id,
        UpdateContactDto dto,
        CancellationToken cancellationToken = default)
    {
        var contact = await db.Contacts.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (contact is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(contact.OrganizationId, "contacts", write: true, contact.Id))
            return new(StatusCodes.Status403Forbidden);

        mapper.Map(dto, contact);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var contact = await db.Contacts.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (contact is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(contact.OrganizationId, "contacts", write: true, contact.Id))
            return new(StatusCodes.Status403Forbidden);

        db.Contacts.Remove(contact);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> ToggleStarAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var contact = await db.Contacts.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (contact is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(contact.OrganizationId, "contacts", write: true, contact.Id))
            return new(StatusCodes.Status403Forbidden);

        contact.Starred = !contact.Starred;
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status200OK, new ContactStarredDto(contact.Starred));
    }
}

public sealed record ContactStarredDto(bool Starred);

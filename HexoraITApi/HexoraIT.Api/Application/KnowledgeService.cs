using AutoMapper;
using AutoMapper.QueryableExtensions;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IKnowledgeService
{
    Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateKnowledgeArticleDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> UpdateAsync(Guid id, UpdateKnowledgeArticleDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> ToggleStarAsync(Guid id, CancellationToken cancellationToken = default);
}

public sealed class KnowledgeService(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : IKnowledgeService
{
    public async Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default)
    {
        if (!Pagination.TryResolve(pagination, out var window))
            return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        if (organizationId is { } organization && !await userContext.HasPermissionAsync(organization, "knowledge"))
            return new(StatusCodes.Status403Forbidden);
        var query = db.KnowledgeArticles.AsQueryable();
        if (organizationId is { } id) query = query.Where(item => item.OrganizationId == id);
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(item => item.Id).Skip(window.Offset).Take(window.PageSize)
            .ProjectTo<KnowledgeArticleDto>(mapper.ConfigurationProvider).ToListAsync(cancellationToken);
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(totalCount, window));
    }

    public async Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.KnowledgeArticles.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        return item is null ? new(StatusCodes.Status404NotFound) : new(StatusCodes.Status200OK, mapper.Map<KnowledgeArticleDto>(item));
    }

    public async Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateKnowledgeArticleDto dto, CancellationToken cancellationToken = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "knowledge", write: true))
            return new(StatusCodes.Status403Forbidden);
        var item = mapper.Map<KnowledgeArticle>(dto);
        item.OrganizationId = organizationId;
        item.UpdatedAt = DateTime.UtcNow;
        db.KnowledgeArticles.Add(item);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status201Created, mapper.Map<KnowledgeArticleDto>(item), $"/api/knowledge/{item.Id}");
    }

    public async Task<ApiOperationResult> UpdateAsync(Guid id, UpdateKnowledgeArticleDto dto, CancellationToken cancellationToken = default)
    {
        var item = await db.KnowledgeArticles.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "knowledge", write: true, item.Id))
            return new(StatusCodes.Status403Forbidden);
        mapper.Map(dto, item);
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.KnowledgeArticles.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "knowledge", write: true, item.Id))
            return new(StatusCodes.Status403Forbidden);
        db.KnowledgeArticles.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> ToggleStarAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.KnowledgeArticles.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "knowledge", write: true, item.Id))
            return new(StatusCodes.Status403Forbidden);
        item.Starred = !item.Starred;
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status200OK, new KnowledgeStarredDto(item.Starred));
    }
}

public sealed record KnowledgeStarredDto(bool Starred);

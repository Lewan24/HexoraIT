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
[Route("api/knowledge")]
public class KnowledgeController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<List<KnowledgeArticleDto>>> GetAll([FromQuery] Guid? organizationId)
    {
        if (organizationId is { } orgId)
        {
            var check = await CheckReadAccessAsync(orgId);
            if (check is not null) return check;
        }

        var query = Db.KnowledgeArticles.AsQueryable();
        if (organizationId is { } id) query = query.Where(a => a.OrganizationId == id);

        return Ok(await query.ProjectTo<KnowledgeArticleDto>(mapper.ConfigurationProvider).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<KnowledgeArticleDto>> GetById(Guid id)
    {
        var article = await Db.KnowledgeArticles.FirstOrDefaultAsync(a => a.Id == id);
        return article is null ? NotFound() : Ok(mapper.Map<KnowledgeArticleDto>(article));
    }

    [HttpPost]
    public async Task<ActionResult<KnowledgeArticleDto>> Create([FromQuery] Guid organizationId, CreateKnowledgeArticleDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        var article = mapper.Map<KnowledgeArticle>(dto);
        article.OrganizationId = organizationId;
        article.UpdatedAt = DateTime.UtcNow;
        Db.KnowledgeArticles.Add(article);
        await Db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = article.Id }, mapper.Map<KnowledgeArticleDto>(article));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateKnowledgeArticleDto dto)
    {
        var article = await Db.KnowledgeArticles.FirstOrDefaultAsync(a => a.Id == id);
        if (article is null) return NotFound();

        var check = await CheckWriteAccessAsync(article.OrganizationId);
        if (check is not null) return check;

        mapper.Map(dto, article);
        article.UpdatedAt = DateTime.UtcNow;
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var article = await Db.KnowledgeArticles.FirstOrDefaultAsync(a => a.Id == id);
        if (article is null) return NotFound();

        var check = await CheckWriteAccessAsync(article.OrganizationId);
        if (check is not null) return check;

        Db.KnowledgeArticles.Remove(article);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:guid}/star")]
    public async Task<IActionResult> ToggleStar(Guid id)
    {
        var article = await Db.KnowledgeArticles.FirstOrDefaultAsync(a => a.Id == id);
        if (article is null) return NotFound();

        var check = await CheckWriteAccessAsync(article.OrganizationId);
        if (check is not null) return check;

        article.Starred = !article.Starred;
        await Db.SaveChangesAsync();
        return Ok(new { article.Starred });
    }
}
using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Validation;

namespace HexoraITApi.Domain.Dtos;

public record KnowledgeArticleDto(Guid Id, string Title, string Category, string Content, List<string> Tags, DateTime UpdatedAt, bool Starred);
public record CreateKnowledgeArticleDto(
    [Required, StringLength(200)] string Title, [StringLength(200)] string Category,
    [Required(AllowEmptyStrings = true), StringLength(100000)] string Content,
    [Required, StringCollection(100, 100)] List<string> Tags);
public record UpdateKnowledgeArticleDto(
    [Required, StringLength(200)] string Title, [StringLength(200)] string Category,
    [Required(AllowEmptyStrings = true), StringLength(100000)] string Content,
    [Required, StringCollection(100, 100)] List<string> Tags);

namespace HexoraITApi.Domain.Dtos;

public record KnowledgeArticleDto(Guid Id, string Title, string Category, string Content, List<string> Tags, DateTime UpdatedAt, bool Starred);
public record CreateKnowledgeArticleDto(string Title, string Category, string Content, List<string> Tags);
public record UpdateKnowledgeArticleDto(string Title, string Category, string Content, List<string> Tags);
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Application.Documentation;

public sealed record DocumentationField(string Label, string Value, bool Translate = false);
public sealed record DocumentationText(string Label, string Content);
public sealed record DocumentationRecord(Guid Id, string Title, List<DocumentationField> Fields, List<DocumentationText> Texts, int? SortIndex = null);
public sealed record DocumentationSection(string Key, List<DocumentationRecord> Records);
public sealed record DocumentationSnapshot(string OrganizationName, string Description, string PreparedBy, DateTime GeneratedAt,
    DocumentationRequestDto Options, List<DocumentationSection> Sections);
public sealed record DocumentationPdf(byte[] Content, string FileName);

public static class DocumentationCatalog
{
    public static readonly string[] Sections = ["assets", "networks", "passwords", "licenses", "contacts", "contracts",
        "knowledge", "warranty", "files", "diagram", "groups", "projects", "plans", "incidents", "tasks", "private-notes"];
    public static readonly string[] Defaults = ["assets", "networks", "licenses", "contacts", "contracts", "knowledge", "warranty", "files", "diagram"];
    public const int MaxRecords = 5000;
    public const int MaxCharacters = 2_000_000;
}

internal sealed class DocumentationTooLargeException : Exception;

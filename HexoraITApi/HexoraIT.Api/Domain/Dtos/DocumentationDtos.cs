using System.ComponentModel.DataAnnotations;

namespace HexoraITApi.Domain.Dtos;

public record DocumentationSelectionDto([Required, StringLength(40)] string Key, [MaxLength(5000)] List<Guid>? ItemIds = null);
public record DocumentationRequestDto(
    [Required, MinLength(1), MaxLength(16)] List<DocumentationSelectionDto> Sections,
    [StringLength(200)] string Title = "",
    [StringLength(200)] string Recipient = "",
    [RegularExpression("^(pl|en)$")] string Language = "pl",
    bool IncludeNotes = false,
    bool IncludeFinancials = false,
    bool IncludeSecrets = false,
    bool ConfirmSensitiveData = false,
    bool IncludeOrganizationDescription = false,
    bool IncludeKnowledgeContent = true);
public record DocumentationSectionOptionDto(string Key, int Count, bool DefaultSelected);
public record DocumentationOptionsDto(List<DocumentationSectionOptionDto> Sections);

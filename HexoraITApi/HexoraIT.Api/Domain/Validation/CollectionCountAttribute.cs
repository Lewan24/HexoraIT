using System.Collections;
using System.ComponentModel.DataAnnotations;

namespace HexoraITApi.Domain.Validation;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class CollectionCountAttribute(int maximum) : ValidationAttribute
{
    public int Maximum { get; } = maximum > 0
        ? maximum
        : throw new ArgumentOutOfRangeException(nameof(maximum));

    public override bool IsValid(object? value) =>
        value is null || value is ICollection collection && collection.Count <= Maximum;

    public override string FormatErrorMessage(string name) =>
        $"The field {name} must contain no more than {Maximum} items.";
}

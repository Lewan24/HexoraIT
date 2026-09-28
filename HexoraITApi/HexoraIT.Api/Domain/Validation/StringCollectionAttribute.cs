using System.Collections;
using System.ComponentModel.DataAnnotations;

namespace HexoraITApi.Domain.Validation;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class StringCollectionAttribute(int maximum, int maximumItemLength) : ValidationAttribute
{
    public int Maximum { get; } = maximum > 0
        ? maximum
        : throw new ArgumentOutOfRangeException(nameof(maximum));

    public int MaximumItemLength { get; } = maximumItemLength > 0
        ? maximumItemLength
        : throw new ArgumentOutOfRangeException(nameof(maximumItemLength));

    public override bool IsValid(object? value)
    {
        if (value is null) return true;
        if (value is not ICollection collection || collection.Count > Maximum || value is not IEnumerable<string> strings)
            return false;

        return strings.All(item => item is not null && item.Length <= MaximumItemLength);
    }

    public override string FormatErrorMessage(string name) =>
        $"The field {name} must contain no more than {Maximum} values of at most {MaximumItemLength} characters each.";
}

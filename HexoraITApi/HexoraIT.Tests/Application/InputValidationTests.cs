using System.ComponentModel.DataAnnotations;
using FluentAssertions;
using HexoraITApi.Domain.Validation;

namespace HexoraIT.Tests.Application;

public sealed class InputValidationTests
{
    [Fact]
    public void CollectionCountAttribute_RejectsMoreThanMaximumItems()
    {
        var attribute = new CollectionCountAttribute(2000);
        var values = Enumerable.Range(0, 2001).ToList();

        var result = attribute.GetValidationResult(values, new ValidationContext(values)
        {
            MemberName = "Nodes"
        });

        result.Should().NotBe(ValidationResult.Success);
        result!.ErrorMessage.Should().Contain("2000");
    }

    [Fact]
    public void StringCollectionAttribute_RejectsTooManyOrOversizedValues()
    {
        var attribute = new StringCollectionAttribute(2, 5);

        attribute.IsValid(new[] { "one", "two", "three" }).Should().BeFalse();
        attribute.IsValid(new[] { "too-long" }).Should().BeFalse();
        attribute.IsValid(new[] { "one", "two" }).Should().BeTrue();
    }
}

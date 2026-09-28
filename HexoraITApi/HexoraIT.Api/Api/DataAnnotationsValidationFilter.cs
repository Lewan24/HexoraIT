using System.ComponentModel.DataAnnotations;

namespace HexoraITApi.Api;

public sealed class DataAnnotationsValidationFilter<T> : IEndpointFilter where T : class
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var model = context.Arguments.OfType<T>().FirstOrDefault();
        if (model is null) return await next(context);

        var validationResults = new List<ValidationResult>();
        Validator.TryValidateObject(model, new ValidationContext(model), validationResults, true);
        ValidatePrimaryConstructorParameters(model, validationResults);
        if (validationResults.Count == 0)
            return await next(context);

        var errors = validationResults
            .SelectMany(result => result.MemberNames.DefaultIfEmpty(string.Empty)
                .Select(member => new { member, message = result.ErrorMessage ?? "The value is invalid." }))
            .GroupBy(error => error.member)
            .ToDictionary(
                group => group.Key,
                group => group.Select(error => error.message).Distinct().ToArray());

        return TypedResults.ValidationProblem(errors);
    }

    private static void ValidatePrimaryConstructorParameters(T model, ICollection<ValidationResult> results)
    {
        var type = typeof(T);
        var constructor = type.GetConstructors()
            .OrderByDescending(candidate => candidate.GetParameters().Length)
            .FirstOrDefault();
        if (constructor is null) return;

        foreach (var parameter in constructor.GetParameters())
        {
            var property = type.GetProperties()
                .FirstOrDefault(candidate => string.Equals(
                    candidate.Name,
                    parameter.Name,
                    StringComparison.OrdinalIgnoreCase));
            if (property is null) continue;

            var value = property.GetValue(model);
            var validationContext = new ValidationContext(model) { MemberName = property.Name };
            foreach (var attribute in parameter.GetCustomAttributes(typeof(ValidationAttribute), true)
                         .Cast<ValidationAttribute>())
            {
                var result = attribute.GetValidationResult(value, validationContext);
                if (result != ValidationResult.Success)
                    results.Add(result!);
            }
        }
    }
}

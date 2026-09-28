using HexoraITApi.Application;

namespace HexoraITApi.Api;

public static class ApiOperationResults
{
    public static IResult ToHttpResult(this ApiOperationResult result, HttpResponse? response = null)
    {
        if (result.Pagination is { } pagination && response is not null)
        {
            Pagination.WriteHeaders(
                response,
                pagination.TotalCount,
                pagination.Window.Page,
                pagination.Window.PageSize);
            if (pagination.Window.IsLegacy && pagination.TotalCount > pagination.Window.PageSize)
                response.Headers["X-Result-Capped"] = "true";
        }

        return result.StatusCode switch
        {
            StatusCodes.Status200OK => Results.Ok(result.Value),
            StatusCodes.Status201Created => Results.Created(result.Location, result.Value),
            StatusCodes.Status204NoContent => Results.NoContent(),
            StatusCodes.Status400BadRequest => Results.BadRequest(result.Value),
            StatusCodes.Status401Unauthorized when result.Value is not null =>
                Results.Json(result.Value, statusCode: StatusCodes.Status401Unauthorized),
            StatusCodes.Status401Unauthorized => Results.Unauthorized(),
            StatusCodes.Status403Forbidden => Results.Forbid(),
            StatusCodes.Status404NotFound when result.Value is not null => Results.NotFound(result.Value),
            StatusCodes.Status404NotFound => Results.NotFound(),
            StatusCodes.Status409Conflict => Results.Conflict(result.Value),
            _ => Results.StatusCode(result.StatusCode)
        };
    }
}

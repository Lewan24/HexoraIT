using System.ComponentModel.DataAnnotations;

namespace HexoraITApi.Application;

public sealed class PaginationParameters
{
    [Range(1, Pagination.MaximumPage)]
    public int? Page { get; init; }

    [Range(1, Pagination.MaximumPageSize)]
    public int? PageSize { get; init; }
}

public sealed record PaginationWindow(int Page, int PageSize, bool IsLegacy)
{
    public int Offset => Pagination.Offset(Page, PageSize);
}

public static class Pagination
{
    public const int DefaultPageSize = 100;
    public const int MaximumPageSize = 200;
    public const int MaximumPage = 10_000;
    public const int LegacyMaximumPageSize = 1_000;

    public static int Offset(int page, int pageSize) => checked((page - 1) * pageSize);

    public static bool TryResolve(PaginationParameters? parameters, out PaginationWindow window)
    {
        var page = parameters?.Page;
        var pageSize = parameters?.PageSize;
        if (page.HasValue != pageSize.HasValue)
        {
            window = null!;
            return false;
        }

        window = page.HasValue
            ? new PaginationWindow(page.Value, pageSize!.Value, IsLegacy: false)
            : new PaginationWindow(1, LegacyMaximumPageSize, IsLegacy: true);
        return true;
    }

    public static void WriteHeaders(HttpResponse response, int totalCount, int page, int pageSize)
    {
        response.Headers["X-Total-Count"] = totalCount.ToString(System.Globalization.CultureInfo.InvariantCulture);
        response.Headers["X-Page"] = page.ToString(System.Globalization.CultureInfo.InvariantCulture);
        response.Headers["X-Page-Size"] = pageSize.ToString(System.Globalization.CultureInfo.InvariantCulture);
    }
}

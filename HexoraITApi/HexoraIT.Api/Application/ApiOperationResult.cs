namespace HexoraITApi.Application;

public sealed record ApiOperationResult(
    int StatusCode,
    object? Value = null,
    string? Location = null,
    PaginationMetadata? Pagination = null);

public sealed record PaginationMetadata(int TotalCount, PaginationWindow Window);

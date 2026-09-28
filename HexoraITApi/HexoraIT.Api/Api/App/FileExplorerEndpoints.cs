using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace HexoraITApi.Api.App;

public static class FileExplorerEndpoints
{
    public static IEndpointRouteBuilder MapFileExplorerEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/files").WithTags("Files").RequireAuthorization();
        group.MapGet("/folders", GetFoldersAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>().Produces<List<FileFolderDto>>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapPost("/folders", CreateFolderAsync).AddEndpointFilter<DataAnnotationsValidationFilter<CreateFolderDto>>().Produces<FileFolderDto>().ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapDelete("/folders/{id:guid}", DeleteFolderAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapGet("", GetFilesAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>().Produces<List<StoredFileDto>>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapPost("/upload", UploadAsync).DisableAntiforgery().WithMetadata(new RequestSizeLimitAttribute(100_000_000)).Produces<StoredFileDto>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapGet("/{id:guid}/content", GetContentAsync).Produces(StatusCodes.Status200OK).Produces(StatusCodes.Status404NotFound);
        group.MapGet("/{id:guid}/download", DownloadAsync).Produces(StatusCodes.Status200OK).Produces(StatusCodes.Status404NotFound);
        group.MapDelete("/{id:guid}", DeleteFileAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapPatch("/folders/{id:guid}", RenameFolderAsync).AddEndpointFilter<DataAnnotationsValidationFilter<RenameFolderDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapPatch("/folders/{id:guid}/move", MoveFolderAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapPatch("/{id:guid}", RenameFileAsync).AddEndpointFilter<DataAnnotationsValidationFilter<RenameFileDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapPatch("/{id:guid}/move", MoveFileAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        return endpoints;
    }
    private static async Task<IResult> GetFoldersAsync(Guid organizationId, Guid? parentFolderId, [AsParameters] PaginationParameters pagination, IFileExplorerService service, HttpResponse response, CancellationToken token) => (await service.GetFoldersAsync(organizationId, parentFolderId, pagination, token)).ToHttpResult(response);
    private static async Task<IResult> CreateFolderAsync(Guid organizationId, CreateFolderDto dto, IFileExplorerService service, CancellationToken token) => (await service.CreateFolderAsync(organizationId, dto, token)).ToHttpResult();
    private static async Task<IResult> DeleteFolderAsync(Guid id, IFileExplorerService service, CancellationToken token) => (await service.DeleteFolderAsync(id, token)).ToHttpResult();
    private static async Task<IResult> GetFilesAsync(Guid organizationId, Guid? folderId, [AsParameters] PaginationParameters pagination, IFileExplorerService service, HttpResponse response, CancellationToken token) => (await service.GetFilesAsync(organizationId, folderId, pagination, token)).ToHttpResult(response);
    private static async Task<IResult> UploadAsync(Guid organizationId, Guid? folderId, IFormFile file, IFileExplorerService service, CancellationToken token) => (await service.UploadAsync(organizationId, folderId, file, token)).ToHttpResult();
    private static async Task<IResult> GetContentAsync(Guid id, IFileExplorerService service, HttpResponse response, CancellationToken token) => await FileResultAsync(id, false, service, response, token);
    private static async Task<IResult> DownloadAsync(Guid id, IFileExplorerService service, HttpResponse response, CancellationToken token) => await FileResultAsync(id, true, service, response, token);
    private static async Task<IResult> FileResultAsync(Guid id, bool download, IFileExplorerService service, HttpResponse response, CancellationToken token)
    {
        var result = await service.GetContentAsync(id, download, token);
        if (result.Value is not DocumentDownload file) return result.ToHttpResult();
        response.Headers[HeaderNames.ContentDisposition] = new ContentDispositionHeaderValue(file.Inline ? "inline" : "attachment") { FileName = file.FileName }.ToString();
        return Results.File(file.Content, file.ContentType);
    }
    private static async Task<IResult> DeleteFileAsync(Guid id, IFileExplorerService service, CancellationToken token) => (await service.DeleteFileAsync(id, token)).ToHttpResult();
    private static async Task<IResult> RenameFolderAsync(Guid id, RenameFolderDto dto, IFileExplorerService service, CancellationToken token) => (await service.RenameFolderAsync(id, dto, token)).ToHttpResult();
    private static async Task<IResult> MoveFolderAsync(Guid id, MoveFolderDto dto, IFileExplorerService service, CancellationToken token) => (await service.MoveFolderAsync(id, dto, token)).ToHttpResult();
    private static async Task<IResult> RenameFileAsync(Guid id, RenameFileDto dto, IFileExplorerService service, CancellationToken token) => (await service.RenameFileAsync(id, dto, token)).ToHttpResult();
    private static async Task<IResult> MoveFileAsync(Guid id, MoveFileDto dto, IFileExplorerService service, CancellationToken token) => (await service.MoveFileAsync(id, dto, token)).ToHttpResult();
}

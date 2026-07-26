namespace HexoraITApi.Api.Interfaces;

public interface IFileStorage
{
    Task<string> SaveAsync(Stream content, string fileName, string contentType);
    Task<Stream> OpenAsync(string path);
    Task DeleteAsync(string path);
}
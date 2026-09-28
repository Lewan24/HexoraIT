namespace HexoraITApi.Application;

public sealed record DocumentDownload(Stream Content, string ContentType, string FileName, bool Inline = false);

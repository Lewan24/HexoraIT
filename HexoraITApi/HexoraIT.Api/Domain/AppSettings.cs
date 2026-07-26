namespace HexoraITApi.Domain;

public sealed class AppSettings
{
    public string HexoraITAdmin { get; init; } = "";

    public bool AllowRegister { get; init; }

    public string[] AllowOrigins { get; init; } = [];
}

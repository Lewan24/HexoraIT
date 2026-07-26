namespace HexoraITApi.Application;

public interface IPasswordHasher
{
    (byte[] Hash, byte[] Salt) Hash(string password);
    bool Verify(string password, byte[] hash, byte[] salt);
}
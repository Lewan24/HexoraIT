namespace HexoraITApi.Api.Interfaces;

public interface IPasswordCipher
{
    byte[] Encrypt(string plaintext);
    string Decrypt(byte[] ciphertext);
}
using HexoraITApi.Api.Interfaces;
using Microsoft.AspNetCore.DataProtection;

namespace HexoraITApi.Application;

public class DataProtectionPasswordCipher(IDataProtectionProvider provider) : IPasswordCipher
{
    private readonly IDataProtector _protector = provider.CreateProtector("ITDocsApi.PasswordEntries.v1");

    public byte[] Encrypt(string plaintext) => _protector.Protect(System.Text.Encoding.UTF8.GetBytes(plaintext));
    public string Decrypt(byte[] ciphertext) => System.Text.Encoding.UTF8.GetString(_protector.Unprotect(ciphertext));
}
using System.Text;
using HexoraITApi.Api.Interfaces;

namespace HexoraIT.Tests.Fakes;

public class FakePasswordCipher : IPasswordCipher
{
    public byte[] Encrypt(string plaintext) => Encoding.UTF8.GetBytes(plaintext);
    public string Decrypt(byte[] ciphertext) => Encoding.UTF8.GetString(ciphertext);
}
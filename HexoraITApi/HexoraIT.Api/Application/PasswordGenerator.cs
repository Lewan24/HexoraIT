using System.Security.Cryptography;

namespace HexoraITApi.Application;

public static class PasswordGenerator
{
    private const string Lowercase = "abcdefghijklmnopqrstuvwxyz";
    private const string Uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private const string Numbers = "0123456789";
    private const string Special = "!@#$%^&*()-_=+[]{}<>?";

    private static readonly string AllCharacters =
        Lowercase + Uppercase + Numbers + Special;

    public static string Generate(int length = 20)
    {
        if (length < 8)
            throw new ArgumentOutOfRangeException(nameof(length), "Password length must be at least 8.");

        Span<char> password = stackalloc char[length];

        password[0] = Lowercase[RandomNumberGenerator.GetInt32(Lowercase.Length)];
        password[1] = Uppercase[RandomNumberGenerator.GetInt32(Uppercase.Length)];
        password[2] = Numbers[RandomNumberGenerator.GetInt32(Numbers.Length)];
        password[3] = Special[RandomNumberGenerator.GetInt32(Special.Length)];

        for (var i = 4; i < length; i++)
        {
            password[i] = AllCharacters[RandomNumberGenerator.GetInt32(AllCharacters.Length)];
        }

        for (var i = password.Length - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (password[i], password[j]) = (password[j], password[i]);
        }

        return new string(password);
    }
}
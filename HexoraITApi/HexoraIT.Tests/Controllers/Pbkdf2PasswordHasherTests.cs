using FluentAssertions;
using HexoraITApi.Application;

namespace HexoraIT.Tests.Controllers;

public class Pbkdf2PasswordHasherTests
{
    private readonly Pbkdf2PasswordHasher _sut = new();

    [Fact]
    public void Hash_ThenVerify_WithCorrectPassword_Succeeds()
    {
        var (hash, salt) = _sut.Hash("correct-horse-battery-staple");
        _sut.Verify("correct-horse-battery-staple", hash, salt).Should().BeTrue();
    }

    [Fact]
    public void Verify_WithWrongPassword_Fails()
    {
        var (hash, salt) = _sut.Hash("correct-password");
        _sut.Verify("wrong-password", hash, salt).Should().BeFalse();
    }

    [Fact]
    public void Hash_SamePasswordTwice_ProducesDifferentHashes()
    {
        var (hash1, salt1) = _sut.Hash("same-password");
        var (hash2, salt2) = _sut.Hash("same-password");

        salt1.Should().NotBeEquivalentTo(salt2);
        hash1.Should().NotBeEquivalentTo(hash2);
    }
}
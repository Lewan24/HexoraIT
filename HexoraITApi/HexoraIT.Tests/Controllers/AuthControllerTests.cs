// using FluentAssertions;
// using HexoraITApi.Api.Auth;
// using HexoraITApi.Application;
// using HexoraITApi.Domain;
// using HexoraITApi.Domain.Dtos;
// using HexoraITApi.Domain.Entities;
// using Microsoft.AspNetCore.Mvc;
// using Microsoft.Extensions.Configuration;
//
// namespace HexoraIT.Tests.Controllers;
//
// public class AuthControllerTests : IDisposable
// {
//     private readonly TestFixture _fx = new();
//     private readonly IPasswordHasher _hasher = new Pbkdf2PasswordHasher();
//     private readonly IJwtTokenService _jwt;
//
//     public AuthControllerTests()
//     {
//         var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
//         {
//             ["Jwt:Issuer"] = "test", ["Jwt:Audience"] = "test",
//             ["Jwt:SigningKey"] = "this-is-a-32-byte-minimum-test-signing-key!!",
//         }).Build();
//         _jwt = new JwtTokenService(config);
//     }
//
//     private AuthController Controller() => new(_fx.Db, _hasher, _jwt);
//
//     [Fact]
//     public async Task Register_FirstUserEver_BecomesAdmin()
//     {
//         var sut = Controller();
//         var result = await sut.Register(new RegisterDto("first@test.local", "password123", "First User"));
//
//         result.Result.Should().BeOfType<OkObjectResult>();
//         var user = _fx.Db.Users.Single();
//         user.SystemRole.Should().Be(SystemRole.Admin);
//     }
//
//     [Fact]
//     public async Task Register_SecondUser_IsRegularUser()
//     {
//         var sut = Controller();
//         await sut.Register(new RegisterDto("first@test.local", "password123", "First"));
//         await sut.Register(new RegisterDto("second@test.local", "password123", "Second"));
//
//         _fx.Db.Users.Single(u => u.Email == "second@test.local").SystemRole.Should().Be(SystemRole.User);
//     }
//
//     [Fact]
//     public async Task Register_DuplicateEmail_ReturnsConflict()
//     {
//         var sut = Controller();
//         await sut.Register(new RegisterDto("dupe@test.local", "password123", "A"));
//         var second = await sut.Register(new RegisterDto("dupe@test.local", "password123", "B"));
//
//         second.Result.Should().BeOfType<ConflictObjectResult>();
//     }
//
//     [Fact]
//     public async Task Register_WhenDisabled_RejectsEveryoneExceptFirstUser()
//     {
//         _fx.Db.AppSettings.Add(new AppSettings { Id = 1, AllowRegistration = false });
//         _fx.Db.SaveChanges();
//
//         var sut = Controller();
//         var first = await sut.Register(new RegisterDto("first@test.local", "password123", "First"));
//         first.Result.Should().BeOfType<OkObjectResult>(); // bootstrap always allowed
//
//         var second = await sut.Register(new RegisterDto("second@test.local", "password123", "Second"));
//         second.Result.Should().BeOfType<BadRequestObjectResult>();
//     }
//
//     [Fact]
//     public async Task Login_WrongPassword_ReturnsUnauthorized()
//     {
//         var sut = Controller();
//         await sut.Register(new RegisterDto("user@test.local", "correct-password", "User"));
//
//         var result = await sut.Login(new LoginDto("user@test.local", "wrong-password", null));
//         result.Result.Should().BeOfType<UnauthorizedObjectResult>();
//     }
//
//     [Fact]
//     public async Task Login_BlockedUser_ReturnsUnauthorized()
//     {
//         var sut = Controller();
//         await sut.Register(new RegisterDto("user@test.local", "password123", "User"));
//         var user = _fx.Db.Users.Single();
//         user.IsBlocked = true;
//         _fx.Db.SaveChanges();
//
//         var result = await sut.Login(new LoginDto("user@test.local", "password123", null));
//         result.Result.Should().BeOfType<UnauthorizedObjectResult>();
//     }
//
//     public void Dispose() => _fx.Dispose();
// }
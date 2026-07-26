using HexoraITApi.Domain;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HexoraITApi.Application;

public sealed class AppInitializer(
    AppDbContext db,
    IPasswordHasher hasher,
    ILogger<AppInitializer> logger,
    IOptions<AppSettings> appSettings)
{
    public async Task InitializeAsync()
    {
        await db.Database.MigrateAsync();

        var adminEmail = appSettings.Value.HexoraITAdmin;

        if (string.IsNullOrWhiteSpace(adminEmail))
            return;

        adminEmail = adminEmail.Trim().ToLowerInvariant();

        if (await db.Users.AnyAsync(x => x.Email == adminEmail))
            return;

        var password = PasswordGenerator.Generate();

        var (hash, salt) = hasher.Hash(password);

        db.Users.Add(new User
        {
            Email = adminEmail,
            DisplayName = "Admin",
            PasswordHash = hash,
            PasswordSalt = salt,
            SystemRole = SystemRole.Admin
        });

        await db.SaveChangesAsync();

        logger.LogWarning("""
                          ============================================
                          Initial administrator created

                          Email: {Email}
                          Password: {Password}

                          Save this password immediately.
                          And change the password after first login! 
                          ============================================
                          """,
            adminEmail,
            password);
    }
}

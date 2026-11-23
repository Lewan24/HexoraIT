using HexoraITApi.Domain;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HexoraITApi.Application;

public interface IAppInitializer
{
    Task InitializeAsync();
}

public sealed class AppInitializer(
    AppDbContext db,
    IPasswordHasher hasher,
    ILogger<AppInitializer> logger,
    IOptions<AppSettings> appSettings) : IAppInitializer
{
    public async Task InitializeAsync()
    {
        await db.Database.MigrateAsync();
        // Serialize catalog publication across replicas. No demo documents are seeded.
        await using (var transaction = await db.Database.BeginTransactionAsync())
        {
            await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(72410261123)");
            await Operations.OperationCatalog.SeedAsync(db);
            await transaction.CommitAsync();
        }

        var adminEmail = appSettings.Value.HexoraITAdmin;

        if (string.IsNullOrWhiteSpace(adminEmail))
            return;

        adminEmail = adminEmail.Trim().ToLowerInvariant();

        if (await db.Users.AnyAsync(x => x.Email == adminEmail))
            return;

        var password = appSettings.Value.InitialAdminPassword;
        if (string.IsNullOrWhiteSpace(password) || password.Length < 15)
        {
            throw new InvalidOperationException(
                "AppSettings:InitialAdminPassword must contain at least 15 characters when creating the initial administrator.");
        }

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

        logger.LogWarning(
            "Initial administrator {Email} was created. Remove the one-time initial password from runtime configuration and change it after the first login.",
            adminEmail);
    }
}

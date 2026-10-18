using ClothingStore.Application.DTOs;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.Infrastructure.Identity;

public interface IAdminProvisioningService
{
    Task ProvisionAsync(string email, string password, CancellationToken cancellationToken);
}

internal sealed class AdminProvisioningService(
    ClothingStoreDbContext db,
    UserManager<ApplicationUser> users,
    RoleManager<IdentityRole> roles) : IAdminProvisioningService
{
    public async Task ProvisionAsync(string email, string password, CancellationToken cancellationToken)
    {
        email = email.Trim();
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        if (!await roles.RoleExistsAsync("Admin"))
        {
            var roleResult = await roles.CreateAsync(new IdentityRole("Admin"));
            EnsureSucceeded(roleResult, "Could not create the Admin role.");
        }

        var user = await users.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser { UserName = email, Email = email };
            var userResult = await users.CreateAsync(user, password);
            EnsureSucceeded(userResult, "Could not create the administrator account.");
        }
        else if (!await users.CheckPasswordAsync(user, password))
        {
            throw new ServiceException(409, "admin_user_exists", "An account with this email already exists; no password or account data was changed.");
        }

        if (!await users.IsInRoleAsync(user, "Admin"))
        {
            var roleResult = await users.AddToRoleAsync(user, "Admin");
            EnsureSucceeded(roleResult, "Could not assign the Admin role.");
        }

        await transaction.CommitAsync(cancellationToken);
    }

    private static void EnsureSucceeded(IdentityResult result, string summary)
    {
        if (!result.Succeeded)
            throw new ServiceException(400, "admin_provisioning_failed",
                $"{summary} {string.Join("; ", result.Errors.Select(x => x.Description))}");
    }
}

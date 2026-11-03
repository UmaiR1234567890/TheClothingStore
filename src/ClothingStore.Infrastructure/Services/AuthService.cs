using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using ClothingStore.Domain.Entities;
using ClothingStore.Infrastructure.Identity;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace ClothingStore.Infrastructure.Services;

internal sealed class AuthService(
    ClothingStoreDbContext db,
    UserManager<ApplicationUser> users,
    SignInManager<ApplicationUser> signIn,
    IOptions<JwtSettings> jwtOptions,
    IEmailSender emailSender) : IAuthService
{
    private readonly JwtSettings _jwt = jwtOptions.Value;

    public async Task<AuthTokenDto> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim();
        if (await users.FindByEmailAsync(email) is not null)
            throw new ServiceException(409, "email_in_use", "An account with this email already exists.");

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            PhoneNumber = NormalizePhone(request.Phone)
        };
        var identityResult = await users.CreateAsync(user, request.Password);
        if (!identityResult.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);
            throw new ServiceException(
                400,
                "registration_failed",
                string.Join("; ", identityResult.Errors.Select(x => x.Description)));
        }

        var customer = await db.Customers.SingleOrDefaultAsync(x => x.Email == email, cancellationToken);
        if (customer is not null && customer.IdentityUserId is not null)
        {
            await transaction.RollbackAsync(cancellationToken);
            throw new ServiceException(409, "customer_already_linked", "This customer profile is already linked to an account.");
        }

        if (customer is null)
        {
            customer = new Customer
            {
                Email = email,
                FirstName = request.FirstName.Trim(),
                LastName = request.LastName.Trim(),
                Phone = NormalizePhone(request.Phone),
                IsDeleted = false
            };
            db.Customers.Add(customer);
        }
        else
        {
            customer.IdentityUserId = user.Id;
            customer.FirstName = request.FirstName.Trim();
            customer.LastName = request.LastName.Trim();
            customer.Phone = NormalizePhone(request.Phone);
            customer.IsDeleted = false;
            customer.DeletedAt = null;
            customer.UpdatedAt = DateTime.UtcNow;
        }

        customer.IdentityUserId = user.Id;
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        await emailSender.SendAsync(new EmailMessage(
            email,
            request.FirstName.Trim(),
            "Welcome to The Clothing Store",
            $"<h2 style=\"font-family:serif\">Welcome, {request.FirstName.Trim()}!</h2>" +
            "<p>Your account is ready — you're now a member of <strong>The Clothing Store</strong>.</p>" +
            "<p>Browse the collection, save your details for faster checkout, and track every order from your account.</p>" +
            "<p style=\"color:#888\">Glad to have you with us.</p>",
            "Welcome! Your account is ready — you're now a member of The Clothing Store."),
            cancellationToken);
        return await CreateTokenAsync(user, customer.CustomerId, cancellationToken);
    }

    public async Task<AuthTokenDto> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user is null)
            throw new ServiceException(401, "invalid_credentials", "Email or password is incorrect.");

        var result = await signIn.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
        {
            if (result.IsLockedOut)
                throw new ServiceException(423, "account_locked", "The account is temporarily locked.");
            throw new ServiceException(401, "invalid_credentials", "Email or password is incorrect.");
        }

        var customer = await db.Customers.AsNoTracking()
            .Where(x => x.IdentityUserId == user.Id)
            .Select(x => new { x.CustomerId, x.IsDeleted })
            .SingleOrDefaultAsync(cancellationToken);
        if (customer?.IsDeleted == true)
            throw new ServiceException(403, "customer_deactivated", "This customer account is inactive.");
        return await CreateTokenAsync(user, customer?.CustomerId, cancellationToken);
    }

    public async Task<AuthUserDto> GetCurrentUserAsync(string identityUserId, CancellationToken cancellationToken)
    {
        var user = await users.FindByIdAsync(identityUserId);
        if (user is null)
            throw new ServiceException(404, "user_not_found", "The authenticated account was not found.");
        var customer = await db.Customers.AsNoTracking()
            .Where(x => x.IdentityUserId == user.Id)
            .Select(x => new { x.CustomerId, x.IsDeleted })
            .SingleOrDefaultAsync(cancellationToken);
        if (customer?.IsDeleted == true)
            throw new ServiceException(403, "customer_deactivated", "This customer account is inactive.");
        var roles = await users.GetRolesAsync(user);
        return new AuthUserDto(user.Id, user.Email ?? string.Empty, customer?.CustomerId, roles.ToArray());
    }

    public async Task ChangePasswordAsync(
        string identityUserId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        var user = await users.FindByIdAsync(identityUserId);
        if (user is null)
            throw new ServiceException(404, "user_not_found", "The authenticated account was not found.");
        var result = await users.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
            throw new ServiceException(
                400,
                "password_change_failed",
                string.Join("; ", result.Errors.Select(x => x.Description)));
    }

    public Task RequestPasswordResetAsync(string email, CancellationToken cancellationToken) =>
        Task.FromException(new ServiceException(
            503,
            "email_delivery_unavailable",
            "Password reset is unavailable because no email delivery provider is configured."));

    public Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken) =>
        Task.FromException(new ServiceException(
            503,
            "email_delivery_unavailable",
            "Password reset is unavailable because no email delivery provider is configured."));

    public async Task<AuthTokenDto> RefreshAsync(string refreshToken, CancellationToken cancellationToken)
    {
        var hash = HashToken(refreshToken);
        var token = await db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == hash, cancellationToken)
            ?? throw new ServiceException(401, "invalid_refresh_token", "Your session expired; please sign in again.");
        if (token.RevokedAt is not null || token.ExpiresAt <= DateTime.UtcNow)
            throw new ServiceException(401, "expired_refresh_token", "Your session expired; please sign in again.");
        var user = await users.FindByIdAsync(token.UserId)
            ?? throw new ServiceException(401, "invalid_refresh_token", "Your session expired; please sign in again.");
        var customerId = (await db.Customers.SingleOrDefaultAsync(x => x.IdentityUserId == user.Id, cancellationToken))?.CustomerId;
        var next = await CreateTokenAsync(user, customerId, cancellationToken);
        token.RevokedAt = DateTime.UtcNow;
        token.ReplacedByTokenHash = HashToken(next.RefreshToken);
        await db.SaveChangesAsync(cancellationToken);
        return next;
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken cancellationToken)
    {
        var token = await db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == HashToken(refreshToken), cancellationToken);
        if (token is not null && token.RevokedAt is null)
        {
            token.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task<AuthTokenDto> CreateTokenAsync(ApplicationUser user, int? customerId, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var expires = now.AddMinutes(_jwt.AccessTokenMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(ClaimTypes.NameIdentifier, user.Id)
        };
        foreach (var role in await users.GetRolesAsync(user))
            claims.Add(new Claim(ClaimTypes.Role, role));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(_jwt.Issuer, _jwt.Audience, claims, now, expires, credentials);
        var authUser = new AuthUserDto(
            user.Id,
            user.Email ?? string.Empty,
            customerId,
            (await users.GetRolesAsync(user)).ToArray());
        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = HashToken(refreshToken),
            CreatedAt = now,
            ExpiresAt = now.AddDays(_jwt.RefreshTokenDays)
        });
        await db.SaveChangesAsync(cancellationToken);
        return new AuthTokenDto(new JwtSecurityTokenHandler().WriteToken(token), "Bearer", (int)(expires - now).TotalSeconds, authUser, refreshToken);
    }

    private static string HashToken(string token) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static string? NormalizePhone(string? phone) =>
        string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();
}

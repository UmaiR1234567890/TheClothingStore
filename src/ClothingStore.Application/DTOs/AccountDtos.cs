using System.ComponentModel.DataAnnotations;

namespace ClothingStore.Application.DTOs;

public sealed class RegisterRequest
{
    [Required, EmailAddress, StringLength(256)]
    public string Email { get; init; } = string.Empty;
    [Required, StringLength(100, MinimumLength = 10)]
    public string Password { get; init; } = string.Empty;
    [Required, StringLength(80)]
    public string FirstName { get; init; } = string.Empty;
    [Required, StringLength(80)]
    public string LastName { get; init; } = string.Empty;
    [StringLength(30)]
    public string? Phone { get; init; }
}

public sealed class LoginRequest
{
    [Required, EmailAddress, StringLength(256)]
    public string Email { get; init; } = string.Empty;
    [Required]
    public string Password { get; init; } = string.Empty;
}

public sealed record AuthUserDto(string UserId, string Email, int? CustomerId, IReadOnlyList<string> Roles);
public sealed record AuthTokenDto(string AccessToken, string TokenType, int ExpiresInSeconds, AuthUserDto User);

public sealed class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; init; } = string.Empty;
    [Required, StringLength(100, MinimumLength = 10)]
    public string NewPassword { get; init; } = string.Empty;
}

public sealed class PasswordEmailRequest
{
    [Required, EmailAddress, StringLength(256)]
    public string Email { get; init; } = string.Empty;
}

public sealed class ResetPasswordRequest
{
    [Required, EmailAddress, StringLength(256)]
    public string Email { get; init; } = string.Empty;
    [Required]
    public string Token { get; init; } = string.Empty;
    [Required, StringLength(100, MinimumLength = 10)]
    public string NewPassword { get; init; } = string.Empty;
}

public sealed record CustomerProfileDto(
    int CustomerId,
    string Email,
    string? FirstName,
    string? LastName,
    string? Phone,
    DateTime CreatedAt);

public sealed class CustomerProfileUpdateRequest
{
    [Required, StringLength(80)]
    public string FirstName { get; init; } = string.Empty;
    [Required, StringLength(80)]
    public string LastName { get; init; } = string.Empty;
    [StringLength(30)]
    public string? Phone { get; init; }
}

public sealed class AddressWriteRequest
{
    [Required, StringLength(160)]
    public string FullName { get; init; } = string.Empty;
    [Required, StringLength(200)]
    public string Line1 { get; init; } = string.Empty;
    [StringLength(200)]
    public string? Line2 { get; init; }
    [Required, StringLength(100)]
    public string City { get; init; } = string.Empty;
    [StringLength(100)]
    public string? Region { get; init; }
    [StringLength(20)]
    public string? PostalCode { get; init; }
    [Required, StringLength(80)]
    public string Country { get; init; } = "Pakistan";
    [StringLength(30)]
    public string? Phone { get; init; }
    public bool IsDefaultShipping { get; init; }
    public bool IsDefaultBilling { get; init; }
}

public sealed record CustomerAddressDto(
    int CustomerAddressId,
    string FullName,
    string Line1,
    string? Line2,
    string City,
    string? Region,
    string? PostalCode,
    string Country,
    string? Phone,
    bool IsDefaultShipping,
    bool IsDefaultBilling);

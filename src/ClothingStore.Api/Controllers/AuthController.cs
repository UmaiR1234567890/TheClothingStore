using System.Security.Claims;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(IAuthService auth) : ControllerBase
{
    [HttpPost("register")]
    [EnableRateLimiting("authentication")]
    [ProducesResponseType(typeof(ApiResponse<AuthTokenDto>), StatusCodes.Status201Created)]
    public async Task<ActionResult<ApiResponse<AuthTokenDto>>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var result = await auth.RegisterAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<AuthTokenDto>.Ok(result, "Account registered."));
    }

    [HttpPost("login")]
    [EnableRateLimiting("authentication")]
    [ProducesResponseType(typeof(ApiResponse<AuthTokenDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<AuthTokenDto>>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await auth.LoginAsync(request, cancellationToken);
        return Ok(ApiResponse<AuthTokenDto>.Ok(result, "Signed in."));
    }

    [Authorize]
    [HttpPost("logout")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public ActionResult<ApiResponse<object>> Logout() =>
        Ok(ApiResponse<object>.Ok(
            new { tokenRevoked = false },
            "Discard the access token on this device. It remains valid until its short expiry."));

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(ApiResponse<AuthUserDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<AuthUserDto>>> Me(CancellationToken cancellationToken)
    {
        var currentUser = await auth.GetCurrentUserAsync(GetIdentityUserId(), cancellationToken);
        return Ok(ApiResponse<AuthUserDto>.Ok(currentUser));
    }

    [HttpPost("forgot-password")]
    [EnableRateLimiting("authentication")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<ApiResponse<object>>> ForgotPassword(
        PasswordEmailRequest request,
        CancellationToken cancellationToken)
    {
        await auth.RequestPasswordResetAsync(request.Email, cancellationToken);
        return Accepted(ApiResponse<object>.Ok(new { accepted = true }));
    }

    [HttpPost("reset-password")]
    [EnableRateLimiting("authentication")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<ApiResponse<object>>> ResetPassword(
        ResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        await auth.ResetPasswordAsync(request, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { reset = true }, "Password reset."));
    }

    [Authorize]
    [HttpPost("change-password")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<object>>> ChangePassword(
        ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        await auth.ChangePasswordAsync(GetIdentityUserId(), request, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { changed = true }, "Password changed."));
    }

    private string GetIdentityUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        throw new ServiceException(401, "identity_required", "An authenticated Identity user is required.");
}

using System.Security.Claims;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Route("api/v1/checkout")]
public sealed class CheckoutController(
    ICheckoutService checkout,
    ICustomerService customers) : ControllerBase
{
    private const string GuestCookie = "tcs.guest-cart";

    [HttpPost("validate")]
    public async Task<ActionResult<ApiResponse<CheckoutValidationDto>>> Validate(
        CheckoutRequest request,
        CancellationToken cancellationToken)
    {
        var (customerId, guestToken) = await ResolveOwnerAsync(cancellationToken);
        var result = await checkout.ValidateAsync(customerId, guestToken, request, cancellationToken);
        return Ok(ApiResponse<CheckoutValidationDto>.Ok(result, result.IsValid ? "Checkout is valid." : "Checkout needs attention."));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<CheckoutResultDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<CheckoutResultDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<CheckoutResultDto>>> Create(
        CheckoutRequest request,
        [FromHeader(Name = "Idempotency-Key")] Guid? idempotencyKey,
        CancellationToken cancellationToken)
    {
        if (idempotencyKey.HasValue)
        {
            request = new CheckoutRequest
            {
                GuestEmail = request.GuestEmail,
                ShippingAddressId = request.ShippingAddressId,
                GuestShippingAddress = request.GuestShippingAddress,
                PaymentMethod = request.PaymentMethod,
                IdempotencyKey = idempotencyKey.Value
            };
        }

        var (customerId, guestToken) = await ResolveOwnerAsync(cancellationToken);
        var result = await checkout.CheckoutAsync(customerId, guestToken, request, cancellationToken);
        return result.WasAlreadyProcessed
            ? Ok(ApiResponse<CheckoutResultDto>.Ok(result, result.Message))
            : StatusCode(StatusCodes.Status201Created, ApiResponse<CheckoutResultDto>.Ok(result, result.Message));
    }

    private async Task<(int? CustomerId, Guid? GuestToken)> ResolveOwnerAsync(CancellationToken cancellationToken)
    {
        if (User.Identity?.IsAuthenticated == true)
        {
            var identityId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(identityId))
                throw new ServiceException(401, "identity_required", "An authenticated Identity user is required.");
            return (await customers.GetCustomerIdAsync(identityId, cancellationToken), null);
        }

        var token = Request.Cookies.TryGetValue(GuestCookie, out var value) &&
                    Guid.TryParse(value, out var parsed) &&
                    parsed != Guid.Empty
            ? parsed
            : (Guid?)null;
        return (null, token);
    }
}

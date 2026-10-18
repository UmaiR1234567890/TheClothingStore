using System.Security.Claims;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Route("api/v1/cart")]
public sealed class CartController(
    ICartService carts,
    ICustomerService customers,
    IWebHostEnvironment environment) : ControllerBase
{
    private const string GuestCookie = "tcs.guest-cart";

    [HttpGet]
    public async Task<ActionResult<ApiResponse<CartDto>>> Get(CancellationToken cancellationToken)
    {
        var (customerId, guestToken) = await ResolveOwnerAsync(cancellationToken);
        var (cart, token) = await carts.GetAsync(customerId, guestToken, cancellationToken);
        SetGuestCookie(token);
        return Ok(ApiResponse<CartDto>.Ok(cart));
    }

    [HttpPost("items")]
    public async Task<ActionResult<ApiResponse<CartDto>>> AddItem(
        AddCartItemRequest request,
        CancellationToken cancellationToken)
    {
        var (customerId, guestToken) = await ResolveOwnerAsync(cancellationToken);
        (guestToken, _) = await EnsureCartSessionAsync(customerId, guestToken, cancellationToken);
        var cart = await carts.AddItemAsync(customerId, guestToken, request, cancellationToken);
        return Ok(ApiResponse<CartDto>.Ok(cart, "Cart item added."));
    }

    [HttpPut("items/{id:int}")]
    public async Task<ActionResult<ApiResponse<CartDto>>> UpdateItem(
        int id,
        UpdateCartItemRequest request,
        CancellationToken cancellationToken)
    {
        var (customerId, guestToken) = await ResolveOwnerAsync(cancellationToken);
        (guestToken, _) = await EnsureCartSessionAsync(customerId, guestToken, cancellationToken);
        var cart = await carts.UpdateItemAsync(customerId, guestToken, id, request.Quantity, cancellationToken);
        return Ok(ApiResponse<CartDto>.Ok(cart, "Cart item updated."));
    }

    [HttpDelete("items/{id:int}")]
    public async Task<IActionResult> RemoveItem(int id, CancellationToken cancellationToken)
    {
        var (customerId, guestToken) = await ResolveOwnerAsync(cancellationToken);
        (guestToken, _) = await EnsureCartSessionAsync(customerId, guestToken, cancellationToken);
        await carts.RemoveItemAsync(customerId, guestToken, id, cancellationToken);
        return NoContent();
    }

    [HttpDelete("items")]
    public async Task<IActionResult> Clear(CancellationToken cancellationToken)
    {
        var (customerId, guestToken) = await ResolveOwnerAsync(cancellationToken);
        (guestToken, _) = await EnsureCartSessionAsync(customerId, guestToken, cancellationToken);
        await carts.ClearAsync(customerId, guestToken, cancellationToken);
        return NoContent();
    }

    [Authorize]
    [HttpPost("merge")]
    public async Task<ActionResult<ApiResponse<CartDto>>> Merge(CancellationToken cancellationToken)
    {
        var customerId = await CustomerIdAsync(cancellationToken);
        if (!TryReadGuestToken(out var token))
        {
            var (customerCart, _) = await carts.GetAsync(customerId, null, cancellationToken);
            return Ok(ApiResponse<CartDto>.Ok(customerCart, "No guest cart was available to merge."));
        }

        var cart = await carts.MergeAsync(customerId, token, cancellationToken);
        Response.Cookies.Delete(GuestCookie, new CookieOptions { Path = "/" });
        return Ok(ApiResponse<CartDto>.Ok(cart, "Guest cart merged."));
    }

    private async Task<(int? CustomerId, Guid? GuestToken)> ResolveOwnerAsync(CancellationToken cancellationToken)
    {
        if (User.Identity?.IsAuthenticated == true)
            return (await CustomerIdAsync(cancellationToken), null);
        return (null, TryReadGuestToken(out var token) ? token : null);
    }

    private async Task<(Guid? Token, CartDto Cart)> EnsureCartSessionAsync(
        int? customerId,
        Guid? guestToken,
        CancellationToken cancellationToken)
    {
        var (cart, token) = await carts.GetAsync(customerId, guestToken, cancellationToken);
        SetGuestCookie(token);
        return (token, cart);
    }

    private async Task<int> CustomerIdAsync(CancellationToken cancellationToken)
    {
        var identityId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(identityId))
            throw new ServiceException(401, "identity_required", "An authenticated Identity user is required.");
        return await customers.GetCustomerIdAsync(identityId, cancellationToken);
    }

    private bool TryReadGuestToken(out Guid token)
    {
        token = Guid.Empty;
        return Request.Cookies.TryGetValue(GuestCookie, out var value) &&
               Guid.TryParse(value, out token) &&
               token != Guid.Empty;
    }

    private void SetGuestCookie(Guid? token)
    {
        if (!token.HasValue)
            return;
        Response.Cookies.Append(GuestCookie, token.Value.ToString("D"), new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps || !environment.IsDevelopment(),
            SameSite = SameSiteMode.Lax,
            Path = "/",
            IsEssential = true,
            MaxAge = TimeSpan.FromDays(30)
        });
    }
}

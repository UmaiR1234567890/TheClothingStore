using System.Security.Claims;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/orders")]
public sealed class OrdersController(
    IOrderService orders,
    ICustomerService customers) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<OrderDto>>>> GetOrders(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        CancellationToken cancellationToken = default)
    {
        var result = await orders.GetCustomerOrdersAsync(
            await CustomerIdAsync(cancellationToken),
            pageNumber,
            pageSize,
            status,
            cancellationToken);
        return Ok(ApiResponse<PagedResult<OrderDto>>.Ok(result));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<OrderDto>>> GetOrder(int id, CancellationToken cancellationToken)
    {
        var order = await orders.GetCustomerOrderAsync(await CustomerIdAsync(cancellationToken), id, cancellationToken);
        return Ok(ApiResponse<OrderDto>.Ok(order));
    }

    [HttpGet("{id:int}/tracking")]
    public async Task<ActionResult<ApiResponse<OrderDto>>> GetTracking(int id, CancellationToken cancellationToken)
    {
        var order = await orders.GetOrderTrackingAsync(await CustomerIdAsync(cancellationToken), id, cancellationToken);
        return Ok(ApiResponse<OrderDto>.Ok(order));
    }

    [AllowAnonymous]
    [HttpGet("track")]
    public async Task<ActionResult<ApiResponse<OrderDto>>> TrackGuestOrder(
        [FromQuery] string orderNumber,
        [FromQuery] string email,
        CancellationToken cancellationToken)
    {
        var order = await orders.GetGuestOrderTrackingAsync(orderNumber, email, cancellationToken);
        return Ok(ApiResponse<OrderDto>.Ok(order));
    }

    private async Task<int> CustomerIdAsync(CancellationToken cancellationToken)
    {
        var identityId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(identityId))
            throw new ServiceException(401, "identity_required", "An authenticated Identity user is required.");
        return await customers.GetCustomerIdAsync(identityId, cancellationToken);
    }
}

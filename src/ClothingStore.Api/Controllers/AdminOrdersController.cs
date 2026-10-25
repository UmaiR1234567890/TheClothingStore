using System.Security.Claims;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Authorize(Policy = "Admin")]
[Route("api/v1/admin/orders")]
public sealed class AdminOrdersController(IOrderService orders) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<OrderDto>>>> GetOrders(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default) =>
        Ok(ApiResponse<PagedResult<OrderDto>>.Ok(
            await orders.GetAdminOrdersAsync(pageNumber, pageSize, status, search, cancellationToken)));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<OrderDto>>> GetOrder(int id, CancellationToken cancellationToken) =>
        Ok(ApiResponse<OrderDto>.Ok(await orders.GetAdminOrderAsync(id, cancellationToken)));

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<ApiResponse<OrderDto>>> UpdateStatus(
        int id,
        StatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        var actor = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(actor))
            throw new ServiceException(401, "identity_required", "An authenticated Identity user is required.");
        var order = await orders.UpdateStatusAsync(id, request.Status, actor, cancellationToken);
        return Ok(ApiResponse<OrderDto>.Ok(order, "Order status updated."));
    }
}

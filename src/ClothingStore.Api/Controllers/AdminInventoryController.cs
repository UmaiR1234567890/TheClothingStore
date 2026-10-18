using System.Security.Claims;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Authorize(Policy = "Admin")]
[Route("api/v1/admin/inventory")]
public sealed class AdminInventoryController(IInventoryService inventory) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<InventoryDto>>>> GetInventory(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default) =>
        Ok(ApiResponse<PagedResult<InventoryDto>>.Ok(
            await inventory.GetInventoryAsync(pageNumber, pageSize, search, cancellationToken)));

    [HttpGet("{variantId:int}")]
    public async Task<ActionResult<ApiResponse<InventoryDto>>> GetInventoryForVariant(
        int variantId,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<InventoryDto>.Ok(await inventory.GetVariantInventoryAsync(variantId, cancellationToken)));

    [HttpPost("adjustments")]
    public async Task<ActionResult<ApiResponse<InventoryDto>>> Adjust(
        InventoryAdjustmentRequest request,
        CancellationToken cancellationToken)
    {
        var actor = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(actor))
            throw new ServiceException(401, "identity_required", "An authenticated Identity user is required.");
        var result = await inventory.AdjustAsync(request, actor, cancellationToken);
        return Ok(ApiResponse<InventoryDto>.Ok(result, "Inventory adjusted."));
    }

    [HttpGet("transactions")]
    public async Task<ActionResult<ApiResponse<PagedResult<InventoryTransactionDto>>>> GetTransactions(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? variantId = null,
        CancellationToken cancellationToken = default) =>
        Ok(ApiResponse<PagedResult<InventoryTransactionDto>>.Ok(
            await inventory.GetTransactionsAsync(pageNumber, pageSize, variantId, cancellationToken)));
}

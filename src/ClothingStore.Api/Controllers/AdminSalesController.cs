using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Authorize(Policy = "Admin")]
[Route("api/v1/admin/sales")]
public sealed class AdminSalesController(IPricingAdminService sales) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<SaleDto>>>> GetSales(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        Ok(ApiResponse<PagedResult<SaleDto>>.Ok(await sales.GetSalesAsync(pageNumber, pageSize, cancellationToken)));

    [HttpPost]
    public async Task<ActionResult<ApiResponse<SaleDto>>> Create(
        SaleWriteRequest request,
        CancellationToken cancellationToken)
    {
        var result = await sales.CreateSaleAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<SaleDto>.Ok(result, "Promotion created."));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<SaleDto>>> Update(
        int id,
        SaleWriteRequest request,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<SaleDto>.Ok(await sales.UpdateSaleAsync(id, request, cancellationToken), "Promotion updated."));

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<ApiResponse<object>>> SetStatus(
        int id,
        StatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        var active = request.Status switch
        {
            "Active" => true,
            "Inactive" => false,
            _ => throw new ServiceException(400, "invalid_sale_status", "Status must be Active or Inactive.")
        };
        await sales.SetSaleStatusAsync(id, active, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { saleId = id, request.Status }));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await sales.DeleteSaleAsync(id, cancellationToken);
        return NoContent();
    }
}

using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Route("api/v1/sales")]
public sealed class SalesController(ICatalogService catalog) : ControllerBase
{
    [HttpGet("active")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<SaleDto>>>> GetActive(CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<SaleDto>>.Ok(await catalog.GetActiveSalesAsync(cancellationToken)));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<SaleDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var sale = await catalog.GetSaleAsync(id, cancellationToken);
        return sale is null
            ? NotFound(ApiResponse<SaleDto>.Fail("Active sale was not found."))
            : Ok(ApiResponse<SaleDto>.Ok(sale));
    }
}

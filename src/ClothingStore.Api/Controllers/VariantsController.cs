using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

public sealed record VariantAvailabilityDto(int ProductVariantId, int QuantityAvailable, bool IsAvailable);

[ApiController]
[Route("api/v1/variants")]
public sealed class VariantsController(ICatalogService catalog) : ControllerBase
{
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<ProductVariantDto>>> GetVariant(int id, CancellationToken cancellationToken)
    {
        var variant = await catalog.GetVariantAsync(id, cancellationToken);
        return variant is null
            ? NotFound(ApiResponse<ProductVariantDto>.Fail("Variant was not found."))
            : Ok(ApiResponse<ProductVariantDto>.Ok(variant));
    }

    [HttpGet("{id:int}/availability")]
    public async Task<ActionResult<ApiResponse<VariantAvailabilityDto>>> GetAvailability(
        int id,
        CancellationToken cancellationToken)
    {
        var variant = await catalog.GetVariantAsync(id, cancellationToken);
        return variant is null
            ? NotFound(ApiResponse<VariantAvailabilityDto>.Fail("Variant was not found."))
            : Ok(ApiResponse<VariantAvailabilityDto>.Ok(new VariantAvailabilityDto(
                variant.ProductVariantId, variant.QuantityAvailable, variant.IsAvailable)));
    }
}

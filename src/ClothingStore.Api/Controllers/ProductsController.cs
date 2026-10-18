using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Route("api/v1/products")]
public sealed class ProductsController(ICatalogService catalog) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<ProductCardDto>>>> GetProducts(
        [FromQuery] ProductQuery query,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<PagedResult<ProductCardDto>>.Ok(
            await catalog.GetProductsAsync(query, cancellationToken)));

    [HttpGet("search")]
    public async Task<ActionResult<ApiResponse<PagedResult<ProductCardDto>>>> Search(
        [FromQuery] ProductQuery query,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<PagedResult<ProductCardDto>>.Ok(
            await catalog.GetProductsAsync(query, cancellationToken)));

    [HttpGet("featured")]
    public async Task<ActionResult<ApiResponse<PagedResult<ProductCardDto>>>> Featured(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        Ok(ApiResponse<PagedResult<ProductCardDto>>.Ok(
            await catalog.GetFeaturedAsync(pageNumber, pageSize, cancellationToken)));

    [HttpGet("new-arrivals")]
    public async Task<ActionResult<ApiResponse<PagedResult<ProductCardDto>>>> NewArrivals(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        Ok(ApiResponse<PagedResult<ProductCardDto>>.Ok(
            await catalog.GetNewArrivalsAsync(pageNumber, pageSize, cancellationToken)));

    [HttpGet("on-sale")]
    public async Task<ActionResult<ApiResponse<PagedResult<ProductCardDto>>>> OnSale(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        Ok(ApiResponse<PagedResult<ProductCardDto>>.Ok(
            await catalog.GetOnSaleAsync(pageNumber, pageSize, cancellationToken)));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<ProductDetailDto>>> GetProduct(int id, CancellationToken cancellationToken)
    {
        var product = await catalog.GetProductAsync(id, cancellationToken);
        return product is null
            ? NotFound(ApiResponse<ProductDetailDto>.Fail("Product was not found."))
            : Ok(ApiResponse<ProductDetailDto>.Ok(product));
    }

    [HttpGet("slug/{slug}")]
    public async Task<ActionResult<ApiResponse<ProductDetailDto>>> GetProductBySlug(
        string slug,
        CancellationToken cancellationToken)
    {
        var product = await catalog.GetProductBySlugAsync(slug, cancellationToken);
        return product is null
            ? NotFound(ApiResponse<ProductDetailDto>.Fail("Product was not found."))
            : Ok(ApiResponse<ProductDetailDto>.Ok(product));
    }

    [HttpGet("{productId:int}/variants")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ProductVariantDto>>>> GetVariants(
        int productId,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<ProductVariantDto>>.Ok(
            await catalog.GetProductVariantsAsync(productId, cancellationToken)));
}

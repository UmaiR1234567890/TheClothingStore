using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Route("api/v1/categories")]
public sealed class CategoriesController(ICatalogService catalog) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CategoryDto>>>> GetCategories(
        [FromQuery] int? departmentId,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<CategoryDto>>.Ok(
            await catalog.GetCategoriesAsync(departmentId, cancellationToken)));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> GetCategory(int id, CancellationToken cancellationToken)
    {
        var category = await catalog.GetCategoryAsync(id, cancellationToken);
        return category is null
            ? NotFound(ApiResponse<CategoryDto>.Fail("Category was not found."))
            : Ok(ApiResponse<CategoryDto>.Ok(category));
    }

    [HttpGet("slug/{slug}")]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> GetCategoryBySlug(
        string slug,
        CancellationToken cancellationToken)
    {
        var category = await catalog.GetCategoryBySlugAsync(slug, cancellationToken);
        return category is null
            ? NotFound(ApiResponse<CategoryDto>.Fail("Category was not found."))
            : Ok(ApiResponse<CategoryDto>.Ok(category));
    }

    [HttpGet("{id:int}/children")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CategoryDto>>>> GetChildren(
        int id,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<CategoryDto>>.Ok(await catalog.GetChildrenAsync(id, cancellationToken)));

    [HttpGet("{id:int}/products")]
    public async Task<ActionResult<ApiResponse<PagedResult<ProductCardDto>>>> GetProducts(
        int id,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await catalog.GetCategoryProductsAsync(id, pageNumber, pageSize, cancellationToken);
        return Ok(ApiResponse<PagedResult<ProductCardDto>>.Ok(result));
    }
}

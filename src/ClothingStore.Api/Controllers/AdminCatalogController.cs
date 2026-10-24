using System.ComponentModel.DataAnnotations;
using ClothingStore.Api;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Authorize(Policy = "Admin")]
[Route("api/v1/admin")]
public sealed class AdminCatalogController(
    ICatalogAdminService catalog,
    IProductImageFileStore imageFiles) : ControllerBase
{
    [HttpGet("products")]
    public async Task<ActionResult<ApiResponse<PagedResult<AdminProductCardDto>>>> GetProducts(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default) =>
        Ok(ApiResponse<PagedResult<AdminProductCardDto>>.Ok(
            await catalog.GetProductsAsync(pageNumber, pageSize, search, cancellationToken)));

    [HttpGet("products/{id:int}")]
    public async Task<ActionResult<ApiResponse<ProductDetailDto>>> GetProduct(int id, CancellationToken cancellationToken) =>
        Ok(ApiResponse<ProductDetailDto>.Ok(await catalog.GetProductAsync(id, cancellationToken)));

    [HttpPost("products")]
    public async Task<ActionResult<ApiResponse<ProductDetailDto>>> CreateProduct(
        ProductWriteRequest request,
        CancellationToken cancellationToken)
    {
        var product = await catalog.CreateProductAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<ProductDetailDto>.Ok(product, "Product created."));
    }

    [HttpPut("products/{id:int}")]
    public async Task<ActionResult<ApiResponse<ProductDetailDto>>> UpdateProduct(
        int id,
        ProductWriteRequest request,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<ProductDetailDto>.Ok(
            await catalog.UpdateProductAsync(id, request, cancellationToken),
            "Product updated."));

    [HttpPatch("products/{id:int}/status")]
    public async Task<ActionResult<ApiResponse<object>>> SetProductStatus(
        int id,
        StatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        await catalog.SetProductStatusAsync(id, request.Status, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { productId = id, request.Status }));
    }

    [HttpDelete("products/{id:int}")]
    public async Task<IActionResult> DeleteProduct(int id, CancellationToken cancellationToken)
    {
        await catalog.DeleteProductAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPost("products/{productId:int}/variants/bulk")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ProductVariantDto>>>> CreateVariants(
        int productId,
        VariantBulkWriteRequest request,
        CancellationToken cancellationToken)
    {
        var variants = await catalog.CreateVariantsAsync(productId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<IReadOnlyList<ProductVariantDto>>.Ok(variants, $"{variants.Count} variants created."));
    }

    [HttpPost("products/{productId:int}/variants")]
    public async Task<ActionResult<ApiResponse<ProductVariantDto>>> CreateVariant(
        int productId,
        VariantWriteRequest request,
        CancellationToken cancellationToken)
    {
        var variant = await catalog.CreateVariantAsync(productId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<ProductVariantDto>.Ok(variant, "Variant created."));
    }

    [HttpPut("variants/{id:int}")]
    public async Task<ActionResult<ApiResponse<ProductVariantDto>>> UpdateVariant(
        int id,
        VariantWriteRequest request,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<ProductVariantDto>.Ok(
            await catalog.UpdateVariantAsync(id, request, cancellationToken),
            "Variant updated."));

    [HttpPatch("variants/{id:int}/status")]
    public async Task<ActionResult<ApiResponse<object>>> SetVariantStatus(
        int id,
        StatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        var active = request.Status switch
        {
            "Active" => true,
            "Inactive" => false,
            _ => throw new ServiceException(400, "invalid_variant_status", "Status must be Active or Inactive.")
        };
        await catalog.SetVariantStatusAsync(id, active, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { variantId = id, request.Status }));
    }

    [HttpPost("products/{productId:int}/images")]
    public async Task<ActionResult<ApiResponse<ProductImageDto>>> CreateImage(
        int productId,
        ProductImageWriteRequest request,
        CancellationToken cancellationToken)
    {
        var image = await catalog.CreateImageAsync(productId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<ProductImageDto>.Ok(image, "Image reference created."));
    }

    [HttpPost("products/{productId:int}/images/upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<ProductImageDto>>> UploadImage(
        int productId,
        [FromForm] ProductImageUploadForm request,
        CancellationToken cancellationToken)
    {
        var file = await imageFiles.SaveAsync(request.File, cancellationToken);
        try
        {
            var image = await catalog.CreateImageAsync(productId, new ProductImageWriteRequest
            {
                ImageUrl = file.ImageUrl,
                AltText = request.AltText,
                ColorId = request.ColorId,
                DisplayOrder = request.DisplayOrder,
                IsPrimary = request.IsPrimary
            }, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<ProductImageDto>.Ok(image, "Image uploaded."));
        }
        catch
        {
            imageFiles.Delete(file);
            throw;
        }
    }

    [HttpPut("images/{id:int}")]
    public async Task<ActionResult<ApiResponse<ProductImageDto>>> UpdateImage(
        int id,
        ProductImageWriteRequest request,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<ProductImageDto>.Ok(
            await catalog.UpdateImageAsync(id, request, cancellationToken),
            "Image reference updated."));

    [HttpDelete("images/{id:int}")]
    public async Task<IActionResult> DeleteImage(int id, CancellationToken cancellationToken)
    {
        await catalog.DeleteImageAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPatch("images/{id:int}/primary")]
    public async Task<ActionResult<ApiResponse<object>>> SetPrimaryImage(int id, CancellationToken cancellationToken)
    {
        await catalog.SetPrimaryImageAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { imageId = id, isPrimary = true }));
    }

    [HttpGet("departments")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<DepartmentDto>>>> GetDepartments(CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<DepartmentDto>>.Ok(await catalog.GetAdminDepartmentsAsync(cancellationToken)));

    [HttpGet("colors")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ColorOptionDto>>>> GetColors(CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<ColorOptionDto>>.Ok(await catalog.GetAdminColorsAsync(cancellationToken)));

    [HttpGet("sizes")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<SizeOptionDto>>>> GetSizes(CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<SizeOptionDto>>.Ok(await catalog.GetAdminSizesAsync(cancellationToken)));

    [HttpPost("departments")]
    public async Task<ActionResult<ApiResponse<DepartmentDto>>> CreateDepartment(
        DepartmentWriteRequest request,
        CancellationToken cancellationToken)
    {
        var department = await catalog.CreateDepartmentAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<DepartmentDto>.Ok(department, "Department created."));
    }

    [HttpPut("departments/{id:int}")]
    public async Task<ActionResult<ApiResponse<DepartmentDto>>> UpdateDepartment(
        int id,
        DepartmentWriteRequest request,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<DepartmentDto>.Ok(await catalog.UpdateDepartmentAsync(id, request, cancellationToken)));

    [HttpPatch("departments/{id:int}/status")]
    public async Task<ActionResult<ApiResponse<object>>> SetDepartmentStatus(
        int id,
        StatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        var active = request.Status switch
        {
            "Active" => true,
            "Inactive" => false,
            _ => throw new ServiceException(400, "invalid_department_status", "Status must be Active or Inactive.")
        };
        await catalog.SetDepartmentStatusAsync(id, active, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { departmentId = id, request.Status }));
    }

    [HttpGet("categories")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CategoryDto>>>> GetCategories(
        [FromQuery] int? departmentId,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<CategoryDto>>.Ok(
            await catalog.GetAdminCategoriesAsync(departmentId, cancellationToken)));

    [HttpPost("categories")]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> CreateCategory(
        CategoryWriteRequest request,
        CancellationToken cancellationToken)
    {
        var category = await catalog.CreateCategoryAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<CategoryDto>.Ok(category, "Category created."));
    }

    [HttpPut("categories/{id:int}")]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> UpdateCategory(
        int id,
        CategoryWriteRequest request,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<CategoryDto>.Ok(await catalog.UpdateCategoryAsync(id, request, cancellationToken)));

    [HttpPatch("categories/{id:int}/status")]
    public async Task<ActionResult<ApiResponse<object>>> SetCategoryStatus(
        int id,
        StatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        var active = request.Status switch
        {
            "Active" => true,
            "Inactive" => false,
            _ => throw new ServiceException(400, "invalid_category_status", "Status must be Active or Inactive.")
        };
        await catalog.SetCategoryStatusAsync(id, active, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { categoryId = id, request.Status }));
    }

    [HttpDelete("categories/{id:int}")]
    public async Task<IActionResult> DeleteCategory(int id, CancellationToken cancellationToken)
    {
        await catalog.DeleteCategoryAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpGet("attributes")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ProductAttributeDefinitionDto>>>> GetAttributes(
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<ProductAttributeDefinitionDto>>.Ok(
            await catalog.GetAttributeDefinitionsAsync(cancellationToken)));

    [HttpPost("attributes")]
    public async Task<ActionResult<ApiResponse<ProductAttributeDefinitionDto>>> CreateAttribute(
        ProductAttributeDefinitionWriteRequest request,
        CancellationToken cancellationToken)
    {
        var attribute = await catalog.CreateAttributeDefinitionAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<ProductAttributeDefinitionDto>.Ok(attribute));
    }

    [HttpPut("attributes/{id:int}")]
    public async Task<ActionResult<ApiResponse<ProductAttributeDefinitionDto>>> UpdateAttribute(
        int id,
        ProductAttributeDefinitionWriteRequest request,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<ProductAttributeDefinitionDto>.Ok(
            await catalog.UpdateAttributeDefinitionAsync(id, request, cancellationToken)));

    [HttpPatch("attributes/{id:int}/status")]
    public async Task<ActionResult<ApiResponse<object>>> SetAttributeStatus(
        int id,
        StatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        var active = request.Status switch
        {
            "Active" => true,
            "Inactive" => false,
            _ => throw new ServiceException(400, "invalid_attribute_status", "Status must be Active or Inactive.")
        };
        await catalog.SetAttributeDefinitionStatusAsync(id, active, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { productAttributeId = id, request.Status }));
    }
}

public sealed class ProductImageUploadForm
{
    [Required]
    public IFormFile File { get; init; } = null!;

    [StringLength(200)]
    public string? AltText { get; init; }

    public int? ColorId { get; init; }

    [Range(0, int.MaxValue)]
    public int DisplayOrder { get; init; }

    public bool IsPrimary { get; init; }
}

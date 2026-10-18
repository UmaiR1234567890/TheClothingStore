using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Route("api/v1/departments")]
public sealed class DepartmentsController(ICatalogService catalog) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<DepartmentDto>>>> GetDepartments(CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<DepartmentDto>>.Ok(await catalog.GetDepartmentsAsync(cancellationToken)));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<DepartmentDto>>> GetDepartment(int id, CancellationToken cancellationToken)
    {
        var department = await catalog.GetDepartmentAsync(id, cancellationToken);
        return department is null
            ? NotFound(ApiResponse<DepartmentDto>.Fail("Department was not found."))
            : Ok(ApiResponse<DepartmentDto>.Ok(department));
    }

    [HttpGet("{slug}/categories")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CategoryDto>>>> GetCategories(
        string slug,
        CancellationToken cancellationToken)
    {
        var categories = await catalog.GetDepartmentCategoriesAsync(slug, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CategoryDto>>.Ok(categories));
    }
}

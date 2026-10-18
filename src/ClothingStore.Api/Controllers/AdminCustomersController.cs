using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Authorize(Policy = "Admin")]
[Route("api/v1/admin/customers")]
public sealed class AdminCustomersController(ICustomerService customers) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<AdminCustomerDto>>>> GetCustomers(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        Ok(ApiResponse<PagedResult<AdminCustomerDto>>.Ok(
            await customers.GetCustomersAsync(pageNumber, pageSize, cancellationToken)));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<AdminCustomerDto>>> GetCustomer(
        int id,
        CancellationToken cancellationToken) =>
        Ok(ApiResponse<AdminCustomerDto>.Ok(await customers.GetAdminCustomerAsync(id, cancellationToken)));

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
            _ => throw new ServiceException(400, "invalid_customer_status", "Status must be Active or Inactive.")
        };
        await customers.SetCustomerStatusAsync(id, active, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { customerId = id, request.Status }));
    }
}

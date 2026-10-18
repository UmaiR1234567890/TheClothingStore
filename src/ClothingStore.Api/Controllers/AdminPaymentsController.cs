using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Authorize(Policy = "Admin")]
[Route("api/v1/admin/payments")]
public sealed class AdminPaymentsController(IPaymentService payments) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<PaymentDto>>>> GetPayments(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        Ok(ApiResponse<PagedResult<PaymentDto>>.Ok(
            await payments.GetAdminPaymentsAsync(pageNumber, pageSize, cancellationToken)));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> GetPayment(int id, CancellationToken cancellationToken) =>
        Ok(ApiResponse<PaymentDto>.Ok(await payments.GetAdminPaymentAsync(id, cancellationToken)));
}

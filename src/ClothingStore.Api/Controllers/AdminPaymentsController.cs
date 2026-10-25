using System.Security.Claims;
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
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default) =>
        Ok(ApiResponse<PagedResult<PaymentDto>>.Ok(
            await payments.GetAdminPaymentsAsync(pageNumber, pageSize, search, cancellationToken)));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> GetPayment(int id, CancellationToken cancellationToken) =>
        Ok(ApiResponse<PaymentDto>.Ok(await payments.GetAdminPaymentAsync(id, cancellationToken)));

    [HttpPost("{id:int}/refund")]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> Refund(
        int id,
        RefundPaymentRequest request,
        CancellationToken cancellationToken)
    {
        var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(actorId))
            throw new ServiceException(401, "identity_required", "An authenticated Identity user is required.");
        var payment = await payments.RefundPaymentAsync(id, actorId, request.Reason, cancellationToken);
        return Ok(ApiResponse<PaymentDto>.Ok(payment, "Payment refunded; the order was marked refunded and stock restored."));
    }
}

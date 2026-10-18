using System.Security.Claims;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.Api.Controllers;

[ApiController]
[Route("api/v1")]
public sealed class PaymentsController(
    IPaymentService payments,
    ICustomerService customers) : ControllerBase
{
    [Authorize]
    [HttpGet("orders/{orderId:int}/payment")]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> GetOrderPayment(
        int orderId,
        CancellationToken cancellationToken)
    {
        var payment = await payments.GetCustomerPaymentAsync(
            await CustomerIdAsync(cancellationToken), orderId, cancellationToken);
        return payment is null
            ? NotFound(ApiResponse<PaymentDto>.Fail("Payment was not found."))
            : Ok(ApiResponse<PaymentDto>.Ok(payment));
    }

    [Authorize]
    [HttpPost("orders/{orderId:int}/payment/initiate")]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> Initiate(
        int orderId,
        InitiatePaymentRequest request,
        CancellationToken cancellationToken)
    {
        var payment = await payments.InitiateCustomerPaymentAsync(
            await CustomerIdAsync(cancellationToken), orderId, request.Method, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<PaymentDto>.Ok(payment, "Payment instruction recorded."));
    }

    [Authorize(Policy = "Admin")]
    [HttpPost("payments/{paymentId:int}/status")]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> UpdateCashPaymentStatus(
        int paymentId,
        PaymentStatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(request.Status, "Captured", StringComparison.Ordinal))
            throw new ServiceException(400, "unsupported_payment_status", "Only verified cash collection can be recorded through this endpoint.");
        var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(actorId))
            throw new ServiceException(401, "identity_required", "An authenticated Identity user is required.");
        var payment = await payments.MarkCashCollectedAsync(paymentId, actorId, request.Reason, cancellationToken);
        return Ok(ApiResponse<PaymentDto>.Ok(payment, "Cash collection recorded by an administrator."));
    }

    private async Task<int> CustomerIdAsync(CancellationToken cancellationToken)
    {
        var identityId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(identityId))
            throw new ServiceException(401, "identity_required", "An authenticated Identity user is required.");
        return await customers.GetCustomerIdAsync(identityId, cancellationToken);
    }
}

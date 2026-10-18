using ClothingStore.Application.Contracts;
using ClothingStore.Domain.Constants;

namespace ClothingStore.Infrastructure.Services;

internal sealed class CashOnDeliveryPaymentProvider : IPaymentProvider
{
    public string Method => "COD";

    public Task<PaymentInitiationResult> InitiateAsync(
        PaymentInitiationRequest request,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (request.Amount < 0)
            throw new ArgumentOutOfRangeException(nameof(request));
        return Task.FromResult(new PaymentInitiationResult(
            Method,
            "CashOnDelivery",
            PaymentStatuses.Pending,
            null,
            "Cash is due on delivery. No online payment was attempted."));
    }
}

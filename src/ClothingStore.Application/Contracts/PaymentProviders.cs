namespace ClothingStore.Application.Contracts;

public sealed record PaymentInitiationRequest(string OrderNumber, decimal Amount);

public sealed record PaymentInitiationResult(
    string Method,
    string Provider,
    string Status,
    string? ProviderReference,
    string Message);

public interface IPaymentProvider
{
    string Method { get; }
    Task<PaymentInitiationResult> InitiateAsync(
        PaymentInitiationRequest request,
        CancellationToken cancellationToken);
}

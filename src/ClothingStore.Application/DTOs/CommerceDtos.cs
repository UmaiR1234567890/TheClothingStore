using System.ComponentModel.DataAnnotations;

namespace ClothingStore.Application.DTOs;

public sealed class AddCartItemRequest
{
    [Range(1, int.MaxValue)]
    public int ProductVariantId { get; init; }
    [Range(1, 100)]
    public int Quantity { get; init; } = 1;
}

public sealed class UpdateCartItemRequest
{
    [Range(1, 100)]
    public int Quantity { get; init; }
}

public sealed record CartLineDto(
    int CartItemId,
    int ProductVariantId,
    string ProductName,
    string Sku,
    VariantOptionDto Options,
    int Quantity,
    decimal UnitPrice,
    decimal LineTotal,
    int QuantityAvailable,
    bool IsAvailable);

public sealed record CartDto(
    int CartId,
    IReadOnlyList<CartLineDto> Items,
    decimal Subtotal,
    int TotalQuantity);

public sealed class CheckoutRequest
{
    [EmailAddress, StringLength(256)]
    public string? GuestEmail { get; init; }
    public int? ShippingAddressId { get; init; }
    public GuestShippingAddressRequest? GuestShippingAddress { get; init; }
    [Required, StringLength(30)]
    public string PaymentMethod { get; init; } = "COD";
    [Required]
    public Guid IdempotencyKey { get; init; }
}

public sealed class GuestShippingAddressRequest
{
    [Required, StringLength(160)]
    public string FullName { get; init; } = string.Empty;
    [Required, StringLength(200)]
    public string Line1 { get; init; } = string.Empty;
    [Required, StringLength(100)]
    public string City { get; init; } = string.Empty;
    [StringLength(100)]
    public string? Region { get; init; }
    [StringLength(20)]
    public string? PostalCode { get; init; }
    [Required, StringLength(80)]
    public string Country { get; init; } = "Pakistan";
}

public sealed record CheckoutValidationDto(
    bool IsValid,
    IReadOnlyList<string> Errors,
    decimal Subtotal,
    decimal Discount,
    decimal Shipping,
    decimal Tax,
    decimal Total);

public sealed record OrderItemDto(
    string ProductName,
    string Sku,
    string? VariantDetails,
    int Quantity,
    decimal UnitPrice,
    decimal DiscountAmount,
    decimal LineTotal);

public sealed record PaymentDto(
    int PaymentId,
    int OrderId,
    decimal Amount,
    string Method,
    string? Provider,
    string? ProviderReference,
    string Status,
    DateTime CreatedAt,
    DateTime? ProcessedAt);

public sealed class InitiatePaymentRequest
{
    [Required, StringLength(30)]
    public string Method { get; init; } = "COD";
}

public sealed class CashCollectionRequest
{
    [Required, StringLength(400, MinimumLength = 3)]
    public string Reason { get; init; } = string.Empty;
}

public sealed class PaymentStatusUpdateRequest
{
    [Required, StringLength(20)]
    public string Status { get; init; } = string.Empty;
    [Required, StringLength(400, MinimumLength = 3)]
    public string Reason { get; init; } = string.Empty;
}

public sealed record ShipmentDto(
    int ShipmentId,
    int OrderId,
    string? Carrier,
    string? TrackingNumber,
    string Status,
    DateTime? ShippedAt,
    DateTime? DeliveredAt);

public sealed record OrderDto(
    int OrderId,
    string OrderNumber,
    string Status,
    decimal SubtotalAmount,
    decimal DiscountAmount,
    decimal ShippingAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    DateTime PlacedAt,
    string? GuestEmail,
    string? ShippingName,
    string? ShippingLine1,
    string? ShippingCity,
    string? ShippingRegion,
    string? ShippingPostalCode,
    string? ShippingCountry,
    IReadOnlyList<OrderItemDto> Items,
    IReadOnlyList<PaymentDto> Payments,
    IReadOnlyList<ShipmentDto> Shipments);

public sealed record CheckoutResultDto(OrderDto Order, string PaymentStatus, string Message, bool WasAlreadyProcessed = false);
public sealed record NewsletterResultDto(string Status);
public sealed class NewsletterEmailRequest
{
    [Required, EmailAddress, StringLength(256)]
    public string Email { get; init; } = string.Empty;
}

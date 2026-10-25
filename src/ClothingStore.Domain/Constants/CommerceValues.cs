namespace ClothingStore.Domain.Constants;

public static class ProductStatuses
{
    public const string Draft = "Draft";
    public const string Active = "Active";
    public const string Inactive = "Inactive";
}

public static class OrderStatuses
{
    public const string Pending = "Pending";
    public const string Paid = "Paid";
    public const string Processing = "Processing";
    public const string Shipped = "Shipped";
    public const string Completed = "Completed";
    public const string Returned = "Returned";
    public const string Refunded = "Refunded";
    public const string Cancelled = "Cancelled";
}

public static class PaymentStatuses
{
    public const string Pending = "Pending";
    public const string Authorized = "Authorized";
    public const string Captured = "Captured";
    public const string Failed = "Failed";
    public const string Refunded = "Refunded";
}

public static class ShipmentStatuses
{
    public const string Pending = "Pending";
    public const string Packed = "Packed";
    public const string Shipped = "Shipped";
    public const string InTransit = "InTransit";
    public const string OutForDelivery = "OutForDelivery";
    public const string Delivered = "Delivered";
    public const string Returned = "Returned";
}

public static class DiscountTypes
{
    public const string Percentage = "Percentage";
    public const string FixedAmount = "FixedAmount";
}

public static class InventoryTransactionTypes
{
    public const string Receipt = "Receipt";
    public const string Sale = "Sale";
    public const string Adjustment = "Adjustment";
    public const string Reservation = "Reservation";
    public const string Release = "Release";
}

namespace ClothingStore.Domain.Entities;

public sealed class Inventory
{
    public int InventoryId { get; set; }
    public int ProductVariantId { get; set; }
    public int QuantityOnHand { get; set; }
    public int QuantityReserved { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ProductVariant ProductVariant { get; set; } = null!;
    public ICollection<InventoryTransaction> Transactions { get; set; } = new List<InventoryTransaction>();
}

public sealed class InventoryTransaction
{
    public long InventoryTransactionId { get; set; }
    public int InventoryId { get; set; }
    public string TransactionType { get; set; } = string.Empty;
    public int QuantityChange { get; set; }
    public int QuantityAfter { get; set; }
    public string? ReferenceType { get; set; }
    public int? ReferenceId { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public Inventory Inventory { get; set; } = null!;
}

public sealed class Customer
{
    public int CustomerId { get; set; }
    public string? IdentityUserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Phone { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public ICollection<CustomerAddress> Addresses { get; set; } = new List<CustomerAddress>();
    public ICollection<Cart> Carts { get; set; } = new List<Cart>();
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}

public sealed class CustomerAddress
{
    public int CustomerAddressId { get; set; }
    public int CustomerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Line1 { get; set; } = string.Empty;
    public string? Line2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string? Region { get; set; }
    public string? PostalCode { get; set; }
    public string Country { get; set; } = "Pakistan";
    public string? Phone { get; set; }
    public bool IsDefaultShipping { get; set; }
    public bool IsDefaultBilling { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public Customer Customer { get; set; } = null!;
}

public sealed class Cart
{
    public int CartId { get; set; }
    public int? CustomerId { get; set; }
    public Guid? GuestToken { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Customer? Customer { get; set; }
    public ICollection<CartItem> Items { get; set; } = new List<CartItem>();
}

public sealed class CartItem
{
    public int CartItemId { get; set; }
    public int CartId { get; set; }
    public int ProductVariantId { get; set; }
    public int Quantity { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Cart Cart { get; set; } = null!;
    public ProductVariant ProductVariant { get; set; } = null!;
}

public sealed class NewsletterSubscription
{
    public int NewsletterSubscriptionId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Status { get; set; } = "Subscribed";
    public DateTime SubscribedAt { get; set; }
    public DateTime? UnsubscribedAt { get; set; }
}

public sealed class Carrier
{
    public int CarrierId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
}

public sealed class AuditLog
{
    public long AuditLogId { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? IdentityUserId { get; set; }
    public string? ChangeSummary { get; set; }
    public DateTime CreatedAt { get; set; }
}

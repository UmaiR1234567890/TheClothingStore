using System.ComponentModel.DataAnnotations;

namespace ClothingStore.Application.DTOs;

public sealed class DepartmentWriteRequest
{
    [Required, StringLength(100)]
    public string Name { get; init; } = string.Empty;
    [Required, StringLength(120)]
    public string Slug { get; init; } = string.Empty;
    [Range(0, int.MaxValue)]
    public int SortOrder { get; init; }
}

public sealed class CategoryWriteRequest
{
    [Range(1, int.MaxValue)]
    public int DepartmentId { get; init; }
    public int? ParentCategoryId { get; init; }
    [Required, StringLength(150)]
    public string Name { get; init; } = string.Empty;
    [Required, StringLength(160)]
    public string Slug { get; init; } = string.Empty;
    [Range(0, int.MaxValue)]
    public int SortOrder { get; init; }
}

public sealed class CategoryPathRequest
{
    [Required, StringLength(800)]
    public string Path { get; init; } = string.Empty;
}

public sealed class SaleWriteRequest
{
    [Required, StringLength(150)]
    public string Name { get; init; } = string.Empty;
    [Required]
    public string DiscountType { get; init; } = string.Empty;
    [Range(typeof(decimal), "0.01", "100000000")]
    public decimal DiscountValue { get; init; }
    public DateTime? StartsAt { get; init; }
    public DateTime? EndsAt { get; init; }
    public List<int> ProductIds { get; init; } = [];
    public List<int> CategoryIds { get; init; } = [];
    public List<int> DepartmentIds { get; init; } = [];
    public bool ApplyToAll { get; init; }
}

public sealed class InventoryAdjustmentRequest
{
    [Range(1, int.MaxValue)]
    public int ProductVariantId { get; init; }
    [Range(-1000000, 1000000)]
    public int QuantityChange { get; init; }
    [Required, StringLength(400, MinimumLength = 3)]
    public string Reason { get; init; } = string.Empty;
}

public sealed class StatusUpdateRequest
{
    [Required, StringLength(20)]
    public string Status { get; init; } = string.Empty;
}

public sealed class ShipmentWriteRequest
{
    [Range(1, int.MaxValue)]
    public int OrderId { get; init; }
    [StringLength(80)]
    public string? Carrier { get; init; }
    [StringLength(80)]
    public string? TrackingNumber { get; init; }
    [Required, StringLength(20)]
    public string Status { get; init; } = "Pending";
}

public sealed record InventoryDto(
    int ProductVariantId,
    string Sku,
    int QuantityOnHand,
    int QuantityReserved,
    int QuantityAvailable,
    DateTime UpdatedAt);

public sealed record InventoryTransactionDto(
    long InventoryTransactionId,
    int ProductVariantId,
    string Sku,
    string TransactionType,
    int QuantityChange,
    int QuantityAfter,
    string? ReferenceType,
    int? ReferenceId,
    string? Notes,
    DateTime CreatedAt);

public sealed record DashboardSummaryDto(
    int ProductCount,
    int CustomerCount,
    int PendingOrderCount,
    decimal CapturedRevenue);

public sealed record AdminCustomerDto(
    int CustomerId,
    string Email,
    string? FirstName,
    string? LastName,
    string? Phone,
    bool IsDeleted,
    DateTime CreatedAt);

public sealed record SizeGroupDto(
    int SizeGroupId,
    string GroupName,
    bool IsActive,
    int SortOrder,
    IReadOnlyList<SizeOptionDto> Items);

public sealed class SizeGroupWriteRequest
{
    [Required, StringLength(80)]
    public string GroupName { get; init; } = string.Empty;
    public int SortOrder { get; init; }
    public bool IsActive { get; init; } = true;
}

public sealed class SizeGroupItemWriteRequest
{
    [Required, StringLength(30)]
    public string Name { get; init; } = string.Empty;
    public int SortOrder { get; init; }
}

public sealed class ColorWriteRequest
{
    [Required, StringLength(80)]
    public string Name { get; init; } = string.Empty;
    [StringLength(7)]
    public string? HexCode { get; init; }
    public int SortOrder { get; init; }
    public bool IsActive { get; init; } = true;
}

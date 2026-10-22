using System.ComponentModel.DataAnnotations;

namespace ClothingStore.Application.DTOs;

public sealed class ProductQuery
{
    public string? Department { get; init; }
    public string? Category { get; init; }
    public string? Search { get; init; }
    public decimal? MinPrice { get; init; }
    public decimal? MaxPrice { get; init; }
    public int? ColorId { get; init; }
    public int? SizeId { get; init; }
    public int? VolumeMl { get; init; }
    public string? Attribute { get; init; }
    public bool? OnSale { get; init; }
    public bool? Available { get; init; }
    public string SortBy { get; init; } = "newest";
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

public sealed record DepartmentDto(int DepartmentId, string Name, string Slug, int SortOrder, bool IsActive);
public sealed record ColorOptionDto(int ColorId, string Name, string? HexCode, int SortOrder, bool IsActive);
public sealed record SizeOptionDto(int SizeId, string SizeType, string Name, int SortOrder, bool IsActive);
public sealed record CategoryDto(
    int CategoryId,
    int DepartmentId,
    int? ParentCategoryId,
    string Name,
    string Slug,
    int SortOrder,
    int ProductCount,
    bool IsActive,
    bool IsDeleted);
public sealed record ProductImageDto(
    int ProductImageId,
    string ImageUrl,
    string? AltText,
    int DisplayOrder,
    bool IsPrimary,
    int? ColorId,
    string? ColorName);
public sealed record ProductAttributeDto(string Name, string Slug, string Value);
public sealed record ProductAttributeDefinitionDto(int ProductAttributeId, string Name, string Slug, bool IsActive);
public sealed record VariantOptionDto(int? ColorId, string? ColorName, int? SizeId, string? SizeName, string? SizeType, int? VolumeMl);

public sealed record ProductVariantDto(
    int ProductVariantId,
    string Sku,
    VariantOptionDto Options,
    bool IsActive,
    bool IsDeleted,
    decimal RegularPrice,
    decimal EffectivePrice,
    bool OnSale,
    int QuantityAvailable,
    bool IsAvailable);

public sealed record ProductCardDto(
    int ProductId,
    string Name,
    string Slug,
    string? Brand,
    string? PrimaryImageUrl,
    decimal? MinPrice,
    decimal? MaxPrice,
    bool OnSale,
    bool IsAvailable);

public sealed record ProductDetailDto(
    int ProductId,
    string Name,
    string Slug,
    string? Description,
    string? Brand,
    string Status,
    bool IsDeleted,
    DateTime CreatedAt,
    IReadOnlyList<CategoryDto> Categories,
    IReadOnlyList<DepartmentDto> Departments,
    IReadOnlyList<ProductImageDto> Images,
    IReadOnlyList<ProductAttributeDto> Attributes,
    IReadOnlyList<ProductVariantDto> Variants);

public sealed record AdminProductCardDto(
    int ProductId,
    string Name,
    string Slug,
    string? Brand,
    string Status,
    bool IsDeleted,
    string? PrimaryImageUrl,
    decimal? MinPrice,
    decimal? MaxPrice,
    int VariantCount);

public sealed record SaleDto(
    int SaleId,
    string Name,
    string DiscountType,
    decimal DiscountValue,
    DateTime? StartsAt,
    DateTime? EndsAt,
    bool IsActive);

public sealed class ProductWriteRequest
{
    [Required, StringLength(200, MinimumLength = 2)]
    public string Name { get; init; } = string.Empty;

    [Required, StringLength(220, MinimumLength = 2)]
    public string Slug { get; init; } = string.Empty;

    public string? Description { get; init; }
    [StringLength(120)]
    public string? Brand { get; init; }

    [Required]
    public string Status { get; init; } = "Draft";

    public List<int> DepartmentIds { get; init; } = [];
    public List<int> CategoryIds { get; init; } = [];
    public List<ProductAttributeInput> Attributes { get; init; } = [];
}

public sealed class ProductAttributeInput
{
    [Required, StringLength(80)]
    public string Slug { get; init; } = string.Empty;

    [Required, StringLength(200)]
    public string Value { get; init; } = string.Empty;
}

public sealed class ProductAttributeDefinitionWriteRequest
{
    [Required, StringLength(80)]
    public string Name { get; init; } = string.Empty;
    [Required, StringLength(80)]
    public string Slug { get; init; } = string.Empty;
}

public sealed class VariantWriteRequest
{
    [Required, StringLength(64)]
    public string Sku { get; init; } = string.Empty;
    public int? ColorId { get; init; }
    public int? SizeId { get; init; }
    [Range(1, 10000)]
    public int? VolumeMl { get; init; }
    [Range(typeof(decimal), "0", "9999999999999999")]
    public decimal RegularPrice { get; init; }
    public bool IsActive { get; init; } = true;
}

public sealed class ProductImageWriteRequest
{
    [Required, UrlOrPath]
    [StringLength(500)]
    public string ImageUrl { get; init; } = string.Empty;
    [StringLength(200)]
    public string? AltText { get; init; }
    public int? ColorId { get; init; }
    [Range(0, int.MaxValue)]
    public int DisplayOrder { get; init; }
    public bool IsPrimary { get; init; }
}

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field)]
public sealed class UrlOrPathAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
    {
        if (value is not string text || string.IsNullOrWhiteSpace(text))
            return false;
        return Uri.TryCreate(text, UriKind.Absolute, out var uri) &&
               (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
               || text.StartsWith("/", StringComparison.Ordinal) && !text.StartsWith("//", StringComparison.Ordinal);
    }
}

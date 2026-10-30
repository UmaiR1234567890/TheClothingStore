using ClothingStore.Domain.Constants;

namespace ClothingStore.Domain.Entities;

public sealed class Department
{
    public int DepartmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public ICollection<Category> Categories { get; set; } = new List<Category>();
    public ICollection<ProductDepartment> ProductDepartments { get; set; } = new List<ProductDepartment>();
    public ICollection<SaleScope> SaleScopes { get; set; } = new List<SaleScope>();
}

public sealed class Color
{
    public int ColorId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? HexCode { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public ICollection<ProductVariant> ProductVariants { get; set; } = new List<ProductVariant>();
    public ICollection<ProductImage> ProductImages { get; set; } = new List<ProductImage>();
}

public sealed class SizeGroup
{
    public int SizeGroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public ICollection<Size> Sizes { get; set; } = new List<Size>();
}

public sealed class Size
{
    public int SizeId { get; set; }
    public int? SizeGroupId { get; set; }
    public SizeGroup? SizeGroup { get; set; }
    public string SizeType { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public ICollection<ProductVariant> ProductVariants { get; set; } = new List<ProductVariant>();
}

public sealed class ProductAttribute
{
    public int ProductAttributeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public ICollection<ProductAttributeValue> Values { get; set; } = new List<ProductAttributeValue>();
}

public sealed class Category
{
    public int CategoryId { get; set; }
    public int DepartmentId { get; set; }
    public int? ParentCategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Department Department { get; set; } = null!;
    public Category? ParentCategory { get; set; }
    public ICollection<Category> Children { get; set; } = new List<Category>();
    public ICollection<ProductCategory> ProductCategories { get; set; } = new List<ProductCategory>();
    public ICollection<SaleScope> SaleScopes { get; set; } = new List<SaleScope>();
}

public sealed class Product
{
    public int ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Brand { get; set; }
    public string Status { get; set; } = ProductStatuses.Active;
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public ICollection<ProductDepartment> ProductDepartments { get; set; } = new List<ProductDepartment>();
    public ICollection<ProductCategory> ProductCategories { get; set; } = new List<ProductCategory>();
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
    public ICollection<ProductAttributeValue> AttributeValues { get; set; } = new List<ProductAttributeValue>();
    public ICollection<SaleProduct> SaleProducts { get; set; } = new List<SaleProduct>();
}

public sealed class ProductDepartment
{
    public int ProductId { get; set; }
    public int DepartmentId { get; set; }
    public Product Product { get; set; } = null!;
    public Department Department { get; set; } = null!;
}

public sealed class ProductCategory
{
    public int ProductId { get; set; }
    public int CategoryId { get; set; }
    public Product Product { get; set; } = null!;
    public Category Category { get; set; } = null!;
}

public sealed class ProductVariant
{
    public int ProductVariantId { get; set; }
    public int ProductId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public int? ColorId { get; set; }
    public int? SizeId { get; set; }
    public int? VolumeMl { get; set; }
    public decimal RegularPrice { get; set; }
    public bool IsActive { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? VariantSignature { get; private set; }
    public Product Product { get; set; } = null!;
    public Color? Color { get; set; }
    public Size? Size { get; set; }
    public Inventory? Inventory { get; set; }
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    public ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
}

public sealed class ProductImage
{
    public int ProductImageId { get; set; }
    public int ProductId { get; set; }
    public int? ColorId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string? AltText { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsPrimary { get; set; }
    public DateTime CreatedAt { get; set; }
    public Product Product { get; set; } = null!;
    public Color? Color { get; set; }
}

public sealed class ProductAttributeValue
{
    public int ProductAttributeValueId { get; set; }
    public int ProductId { get; set; }
    public int ProductAttributeId { get; set; }
    public string AttributeValue { get; set; } = string.Empty;
    public Product Product { get; set; } = null!;
    public ProductAttribute ProductAttribute { get; set; } = null!;
}

public sealed class Sale
{
    public int SaleId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string DiscountType { get; set; } = string.Empty;
    public decimal DiscountValue { get; set; }
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public bool IsActive { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public ICollection<SaleProduct> SaleProducts { get; set; } = new List<SaleProduct>();
    public ICollection<SaleScope> SaleScopes { get; set; } = new List<SaleScope>();
}

public sealed class SaleProduct
{
    public int SaleId { get; set; }
    public int ProductId { get; set; }
    public Sale Sale { get; set; } = null!;
    public Product Product { get; set; } = null!;
}

public sealed class SaleScope
{
    public int SaleScopeId { get; set; }
    public int SaleId { get; set; }
    public int? DepartmentId { get; set; }
    public int? CategoryId { get; set; }
    public Sale Sale { get; set; } = null!;
    public Department? Department { get; set; }
    public Category? Category { get; set; }
}

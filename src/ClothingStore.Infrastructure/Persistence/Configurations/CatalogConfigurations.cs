using ClothingStore.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClothingStore.Infrastructure.Persistence.Configurations;

internal sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("Categories", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint(
                "CK_Categories_ParentNotSelf",
                "[ParentCategoryId] IS NULL OR [ParentCategoryId] <> [CategoryId]");
        });
        builder.HasKey(x => x.CategoryId).HasName("PK_Categories");
        builder.Property(x => x.Name).HasMaxLength(150).IsRequired();
        builder.Property(x => x.Slug).HasMaxLength(160).IsRequired();
        builder.Property(x => x.SortOrder).HasDefaultValue(0);
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
        builder.Property(x => x.DeletedAt).HasColumnType("datetime2(0)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime2(0)");
        builder.HasIndex(x => new { x.DepartmentId, x.Slug }).IsUnique().HasDatabaseName("UX_Categories_Department_Slug");
        builder.HasIndex(x => x.ParentCategoryId).HasDatabaseName("IX_Categories_ParentCategoryId");
        builder.HasOne(x => x.Department)
            .WithMany(x => x.Categories)
            .HasForeignKey(x => x.DepartmentId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_Categories_Departments");
        builder.HasOne(x => x.ParentCategory)
            .WithMany(x => x.Children)
            .HasForeignKey(x => x.ParentCategoryId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_Categories_Parent");
    }
}

internal sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("Products", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint(
                "CK_Products_Status",
                "[Status] IN (N'Draft', N'Active', N'Inactive')");
        });
        builder.HasKey(x => x.ProductId).HasName("PK_Products");
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Slug).HasMaxLength(220).IsRequired();
        builder.Property(x => x.Description).HasColumnType("nvarchar(max)");
        builder.Property(x => x.Brand).HasMaxLength(120);
        builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Active").IsRequired();
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
        builder.Property(x => x.DeletedAt).HasColumnType("datetime2(0)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime2(0)");
        builder.HasIndex(x => x.Slug).IsUnique().HasDatabaseName("UX_Products_Slug");
        builder.HasIndex(x => x.Status).HasDatabaseName("IX_Products_Status").HasFilter("[IsDeleted] = 0");
    }
}

internal sealed class ProductDepartmentConfiguration : IEntityTypeConfiguration<ProductDepartment>
{
    public void Configure(EntityTypeBuilder<ProductDepartment> builder)
    {
        builder.ToTable("ProductDepartments", "dbo", table => table.ExcludeFromMigrations());
        builder.HasKey(x => new { x.ProductId, x.DepartmentId }).HasName("PK_ProductDepartments");
        builder.HasIndex(x => new { x.DepartmentId, x.ProductId }).HasDatabaseName("IX_ProductDepartments_DepartmentId");
        builder.HasOne(x => x.Product)
            .WithMany(x => x.ProductDepartments)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_ProductDepartments_Products");
        builder.HasOne(x => x.Department)
            .WithMany(x => x.ProductDepartments)
            .HasForeignKey(x => x.DepartmentId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_ProductDepartments_Departments");
    }
}

internal sealed class ProductCategoryConfiguration : IEntityTypeConfiguration<ProductCategory>
{
    public void Configure(EntityTypeBuilder<ProductCategory> builder)
    {
        builder.ToTable("ProductCategories", "dbo", table => table.ExcludeFromMigrations());
        builder.HasKey(x => new { x.ProductId, x.CategoryId }).HasName("PK_ProductCategories");
        builder.HasIndex(x => new { x.CategoryId, x.ProductId }).HasDatabaseName("IX_ProductCategories_CategoryId");
        builder.HasOne(x => x.Product)
            .WithMany(x => x.ProductCategories)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_ProductCategories_Products");
        builder.HasOne(x => x.Category)
            .WithMany(x => x.ProductCategories)
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_ProductCategories_Categories");
    }
}

internal sealed class ProductVariantConfiguration : IEntityTypeConfiguration<ProductVariant>
{
    private const string SignatureSql =
        "CONVERT(NVARCHAR(20), ProductId) + N'|' + " +
        "ISNULL(CONVERT(NVARCHAR(20), ColorId), N'x') + N'|' + " +
        "ISNULL(CONVERT(NVARCHAR(20), SizeId), N'x') + N'|' + " +
        "ISNULL(CONVERT(NVARCHAR(20), VolumeMl), N'x')";

    public void Configure(EntityTypeBuilder<ProductVariant> builder)
    {
        builder.ToTable("ProductVariants", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint("CK_ProductVariants_VolumeMl", "[VolumeMl] IS NULL OR [VolumeMl] > 0");
            table.HasCheckConstraint("CK_ProductVariants_RegularPrice", "[RegularPrice] >= 0");
        });
        builder.HasKey(x => x.ProductVariantId).HasName("PK_ProductVariants");
        builder.Property(x => x.Sku).HasMaxLength(64).IsRequired();
        builder.Property(x => x.VolumeMl);
        builder.Property(x => x.RegularPrice).HasPrecision(18, 2);
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
        builder.Property(x => x.DeletedAt).HasColumnType("datetime2(0)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime2(0)");
        builder.Property(x => x.VariantSignature)
            .HasColumnType("nvarchar(83)")
            .HasComputedColumnSql(SignatureSql, stored: true)
            .IsRequired(false);
        builder.HasIndex(x => x.Sku).IsUnique().HasDatabaseName("UX_ProductVariants_Sku");
        builder.HasIndex(x => x.VariantSignature).IsUnique().HasDatabaseName("UX_ProductVariants_Signature");
        builder.HasIndex(x => x.ProductId)
            .HasDatabaseName("IX_ProductVariants_ProductId")
            .IncludeProperties(x => new { x.Sku, x.RegularPrice, x.IsActive });
        builder.HasIndex(x => new { x.ColorId, x.ProductId })
            .HasDatabaseName("IX_ProductVariants_ColorId")
            .HasFilter("[ColorId] IS NOT NULL");
        builder.HasIndex(x => new { x.SizeId, x.ProductId })
            .HasDatabaseName("IX_ProductVariants_SizeId")
            .HasFilter("[SizeId] IS NOT NULL");
        builder.HasOne(x => x.Product)
            .WithMany(x => x.Variants)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_ProductVariants_Products");
        builder.HasOne(x => x.Color)
            .WithMany(x => x.ProductVariants)
            .HasForeignKey(x => x.ColorId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_ProductVariants_Colors");
        builder.HasOne(x => x.Size)
            .WithMany(x => x.ProductVariants)
            .HasForeignKey(x => x.SizeId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_ProductVariants_Sizes");
    }
}

internal sealed class ProductImageConfiguration : IEntityTypeConfiguration<ProductImage>
{
    public void Configure(EntityTypeBuilder<ProductImage> builder)
    {
        builder.ToTable("ProductImages", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint("CK_ProductImages_DisplayOrder", "[DisplayOrder] >= 0");
        });
        builder.HasKey(x => x.ProductImageId).HasName("PK_ProductImages");
        builder.Property(x => x.ImageUrl).HasMaxLength(500).IsRequired();
        builder.Property(x => x.AltText).HasMaxLength(200);
        builder.Property(x => x.DisplayOrder).HasDefaultValue(0);
        builder.Property(x => x.IsPrimary).HasDefaultValue(false);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.HasIndex(x => new { x.ProductId, x.DisplayOrder }).HasDatabaseName("IX_ProductImages_ProductId");
        builder.HasIndex(x => new { x.ProductId, x.ColorId, x.DisplayOrder })
            .HasDatabaseName("IX_ProductImages_Product_Color_DisplayOrder");
        builder.HasIndex(x => new { x.ProductId, x.ColorId })
            .IsUnique()
            .HasDatabaseName("UX_ProductImages_Primary")
            .HasFilter("[IsPrimary] = 1");
        builder.HasOne(x => x.Product)
            .WithMany(x => x.Images)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_ProductImages_Products");
        builder.HasOne(x => x.Color)
            .WithMany(x => x.ProductImages)
            .HasForeignKey(x => x.ColorId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_ProductImages_Colors");
    }
}

internal sealed class ProductAttributeValueConfiguration : IEntityTypeConfiguration<ProductAttributeValue>
{
    public void Configure(EntityTypeBuilder<ProductAttributeValue> builder)
    {
        builder.ToTable("ProductAttributeValues", "dbo", table => table.ExcludeFromMigrations());
        builder.HasKey(x => x.ProductAttributeValueId).HasName("PK_ProductAttributeValues");
        builder.Property(x => x.AttributeValue).HasMaxLength(200).IsRequired();
        builder.HasIndex(x => new { x.ProductId, x.ProductAttributeId })
            .IsUnique()
            .HasDatabaseName("UX_ProductAttributeValues_Product_Attribute");
        builder.HasIndex(x => new { x.ProductAttributeId, x.ProductId })
            .HasDatabaseName("IX_ProductAttributeValues_AttributeId")
            .IncludeProperties(x => x.AttributeValue);
        builder.HasOne(x => x.Product)
            .WithMany(x => x.AttributeValues)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_ProductAttributeValues_Products");
        builder.HasOne(x => x.ProductAttribute)
            .WithMany(x => x.Values)
            .HasForeignKey(x => x.ProductAttributeId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_ProductAttributeValues_Attributes");
    }
}

using ClothingStore.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClothingStore.Infrastructure.Persistence.Configurations;

internal sealed class SaleConfiguration : IEntityTypeConfiguration<Sale>
{
    public void Configure(EntityTypeBuilder<Sale> builder)
    {
        builder.ToTable("Sales", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint("CK_Sales_DiscountType", "[DiscountType] IN (N'Percentage', N'FixedAmount')");
            table.HasCheckConstraint(
                "CK_Sales_DiscountValue",
                "([DiscountType] = N'Percentage' AND [DiscountValue] >= 0 AND [DiscountValue] <= 100) OR " +
                "([DiscountType] = N'FixedAmount' AND [DiscountValue] > 0)");
            table.HasCheckConstraint(
                "CK_Sales_Window",
                "[EndsAt] IS NULL OR [StartsAt] IS NULL OR [EndsAt] >= [StartsAt]");
        });
        builder.HasKey(x => x.SaleId).HasName("PK_Sales");
        builder.Property(x => x.Name).HasMaxLength(150).IsRequired();
        builder.Property(x => x.DiscountType).HasMaxLength(20).IsRequired();
        builder.Property(x => x.DiscountValue).HasPrecision(18, 2);
        builder.Property(x => x.StartsAt).HasColumnType("datetime2(0)");
        builder.Property(x => x.EndsAt).HasColumnType("datetime2(0)");
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
        builder.Property(x => x.DeletedAt).HasColumnType("datetime2(0)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime2(0)");
        builder.HasIndex(x => new { x.IsActive, x.StartsAt, x.EndsAt })
            .HasDatabaseName("IX_Sales_ActiveWindow")
            .HasFilter("[IsDeleted] = 0");
    }
}

internal sealed class SaleProductConfiguration : IEntityTypeConfiguration<SaleProduct>
{
    public void Configure(EntityTypeBuilder<SaleProduct> builder)
    {
        builder.ToTable("SaleProducts", "dbo", table => table.ExcludeFromMigrations());
        builder.HasKey(x => new { x.SaleId, x.ProductId }).HasName("PK_SaleProducts");
        builder.HasIndex(x => x.ProductId).HasDatabaseName("IX_SaleProducts_ProductId");
        builder.HasOne(x => x.Sale)
            .WithMany(x => x.SaleProducts)
            .HasForeignKey(x => x.SaleId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_SaleProducts_Sales");
        builder.HasOne(x => x.Product)
            .WithMany(x => x.SaleProducts)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_SaleProducts_Products");
    }
}

internal sealed class SaleScopeConfiguration : IEntityTypeConfiguration<SaleScope>
{
    public void Configure(EntityTypeBuilder<SaleScope> builder)
    {
        builder.ToTable("SaleScopes", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint(
                "CK_SaleScopes_Target",
                "[CategoryId] IS NULL OR [DepartmentId] IS NULL");
        });
        builder.HasKey(x => x.SaleScopeId).HasName("PK_SaleScopes");
        builder.HasIndex(x => x.SaleId).HasDatabaseName("IX_SaleScopes_SaleId");
        builder.HasIndex(x => x.CategoryId).HasDatabaseName("IX_SaleScopes_CategoryId");
        builder.HasIndex(x => x.DepartmentId).HasDatabaseName("IX_SaleScopes_DepartmentId");
        builder.HasOne(x => x.Sale)
            .WithMany(x => x.SaleScopes)
            .HasForeignKey(x => x.SaleId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_SaleScopes_Sales");
        builder.HasOne(x => x.Department)
            .WithMany(x => x.SaleScopes)
            .HasForeignKey(x => x.DepartmentId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_SaleScopes_Departments");
        builder.HasOne(x => x.Category)
            .WithMany(x => x.SaleScopes)
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_SaleScopes_Categories");
    }
}

internal sealed class CarrierConfiguration : IEntityTypeConfiguration<Carrier>
{
    public void Configure(EntityTypeBuilder<Carrier> builder)
    {
        builder.ToTable("Carriers", "dbo", table => table.ExcludeFromMigrations());
        builder.HasKey(x => x.CarrierId).HasName("PK_Carriers");
        builder.Property(x => x.Name).HasMaxLength(80).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(20).IsRequired();
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.SortOrder).HasDefaultValue(0);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_Carriers_Code");
    }
}

internal sealed class InventoryConfiguration : IEntityTypeConfiguration<Inventory>
{
    public void Configure(EntityTypeBuilder<Inventory> builder)
    {
        builder.ToTable("Inventory", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint("CK_Inventory_OnHand", "[QuantityOnHand] >= 0");
            table.HasCheckConstraint("CK_Inventory_Reserved", "[QuantityReserved] >= 0");
            table.HasCheckConstraint(
                "CK_Inventory_ReservedNotAboveOnHand",
                "[QuantityReserved] <= [QuantityOnHand]");
        });
        builder.HasKey(x => x.InventoryId).HasName("PK_Inventory");
        builder.Property(x => x.QuantityOnHand).HasDefaultValue(0);
        builder.Property(x => x.QuantityReserved).HasDefaultValue(0);
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.HasIndex(x => x.ProductVariantId).IsUnique().HasDatabaseName("UX_Inventory_ProductVariantId");
        builder.HasOne(x => x.ProductVariant)
            .WithOne(x => x.Inventory)
            .HasForeignKey<Inventory>(x => x.ProductVariantId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_Inventory_ProductVariants");
    }
}

internal sealed class InventoryTransactionConfiguration : IEntityTypeConfiguration<InventoryTransaction>
{
    public void Configure(EntityTypeBuilder<InventoryTransaction> builder)
    {
        builder.ToTable("InventoryTransactions", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint(
                "CK_InventoryTransactions_Type",
                "[TransactionType] IN (N'Receipt', N'Sale', N'Adjustment', N'Reservation', N'Release')");
            table.HasCheckConstraint("CK_InventoryTransactions_QuantityAfter", "[QuantityAfter] >= 0");
        });
        builder.HasKey(x => x.InventoryTransactionId).HasName("PK_InventoryTransactions");
        builder.Property(x => x.TransactionType).HasMaxLength(20).IsRequired();
        builder.Property(x => x.ReferenceType).HasMaxLength(40);
        builder.Property(x => x.Notes).HasMaxLength(400);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.HasIndex(x => new { x.InventoryId, x.CreatedAt }).HasDatabaseName("IX_InventoryTransactions_InventoryId");
        builder.HasOne(x => x.Inventory)
            .WithMany(x => x.Transactions)
            .HasForeignKey(x => x.InventoryId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_InventoryTransactions_Inventory");
    }
}

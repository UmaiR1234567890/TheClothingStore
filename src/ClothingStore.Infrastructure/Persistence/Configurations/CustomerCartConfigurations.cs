using ClothingStore.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClothingStore.Infrastructure.Persistence.Configurations;

internal sealed class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.ToTable("Customers", "dbo", table => table.ExcludeFromMigrations());
        builder.HasKey(x => x.CustomerId).HasName("PK_Customers");
        builder.Property(x => x.IdentityUserId).HasMaxLength(450);
        builder.Property(x => x.Email).HasMaxLength(256).IsRequired();
        builder.Property(x => x.FirstName).HasMaxLength(80);
        builder.Property(x => x.LastName).HasMaxLength(80);
        builder.Property(x => x.Phone).HasMaxLength(30);
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
        builder.Property(x => x.DeletedAt).HasColumnType("datetime2(0)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime2(0)");
        builder.HasIndex(x => x.Email).IsUnique().HasDatabaseName("UX_Customers_Email");
        builder.HasIndex(x => x.IdentityUserId)
            .IsUnique()
            .HasDatabaseName("UX_Customers_IdentityUserId")
            .HasFilter("[IdentityUserId] IS NOT NULL");
    }
}

internal sealed class CustomerAddressConfiguration : IEntityTypeConfiguration<CustomerAddress>
{
    public void Configure(EntityTypeBuilder<CustomerAddress> builder)
    {
        builder.ToTable("CustomerAddresses", "dbo", table => table.ExcludeFromMigrations());
        builder.HasKey(x => x.CustomerAddressId).HasName("PK_CustomerAddresses");
        builder.Property(x => x.FullName).HasMaxLength(160).IsRequired();
        builder.Property(x => x.Line1).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Line2).HasMaxLength(200);
        builder.Property(x => x.City).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Region).HasMaxLength(100);
        builder.Property(x => x.PostalCode).HasMaxLength(20);
        builder.Property(x => x.Country).HasMaxLength(80).HasDefaultValue("Pakistan").IsRequired();
        builder.Property(x => x.Phone).HasMaxLength(30);
        builder.Property(x => x.IsDefaultShipping).HasDefaultValue(false);
        builder.Property(x => x.IsDefaultBilling).HasDefaultValue(false);
        builder.Property(x => x.IsDeleted).HasDefaultValue(false);
        builder.Property(x => x.DeletedAt).HasColumnType("datetime2(0)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.HasIndex(x => x.CustomerId).HasDatabaseName("IX_CustomerAddresses_CustomerId");
        builder.HasOne(x => x.Customer)
            .WithMany(x => x.Addresses)
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_CustomerAddresses_Customers");
    }
}

internal sealed class CartConfiguration : IEntityTypeConfiguration<Cart>
{
    public void Configure(EntityTypeBuilder<Cart> builder)
    {
        builder.ToTable("Carts", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint(
                "CK_Carts_Owner",
                "([CustomerId] IS NOT NULL AND [GuestToken] IS NULL) OR " +
                "([CustomerId] IS NULL AND [GuestToken] IS NOT NULL)");
        });
        builder.HasKey(x => x.CartId).HasName("PK_Carts");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.HasIndex(x => x.CustomerId)
            .IsUnique()
            .HasDatabaseName("UX_Carts_CustomerId")
            .HasFilter("[CustomerId] IS NOT NULL");
        builder.HasIndex(x => x.GuestToken)
            .IsUnique()
            .HasDatabaseName("UX_Carts_GuestToken")
            .HasFilter("[GuestToken] IS NOT NULL");
        builder.HasOne(x => x.Customer)
            .WithMany(x => x.Carts)
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_Carts_Customers");
    }
}

internal sealed class CartItemConfiguration : IEntityTypeConfiguration<CartItem>
{
    public void Configure(EntityTypeBuilder<CartItem> builder)
    {
        builder.ToTable("CartItems", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint("CK_CartItems_Quantity", "[Quantity] > 0");
        });
        builder.HasKey(x => x.CartItemId).HasName("PK_CartItems");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime2(0)");
        builder.HasIndex(x => new { x.CartId, x.ProductVariantId })
            .IsUnique()
            .HasDatabaseName("UX_CartItems_Cart_Variant");
        builder.HasIndex(x => x.ProductVariantId)
            .HasDatabaseName("IX_CartItems_ProductVariantId")
            .IncludeProperties(x => new { x.CartId, x.Quantity });
        builder.HasOne(x => x.Cart)
            .WithMany(x => x.Items)
            .HasForeignKey(x => x.CartId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_CartItems_Carts");
        builder.HasOne(x => x.ProductVariant)
            .WithMany(x => x.CartItems)
            .HasForeignKey(x => x.ProductVariantId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_CartItems_ProductVariants");
    }
}

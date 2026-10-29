using ClothingStore.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClothingStore.Infrastructure.Persistence.Configurations;

internal sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("Orders", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint(
                "CK_Orders_Status",
                "[Status] IN (N'Pending', N'Paid', N'Processing', N'Shipped', N'Completed', N'Cancelled')");
            table.HasCheckConstraint(
                "CK_Orders_Amounts",
                "[SubtotalAmount] >= 0 AND [DiscountAmount] >= 0 AND [ShippingAmount] >= 0 AND " +
                "[TaxAmount] >= 0 AND [TotalAmount] >= 0 AND " +
                "[TotalAmount] = ([SubtotalAmount] - [DiscountAmount] + [ShippingAmount] + [TaxAmount])");
            table.HasCheckConstraint(
                "CK_Orders_CustomerOrGuest",
                "[CustomerId] IS NOT NULL OR ([CustomerId] IS NULL AND [GuestEmail] IS NOT NULL)");
        });
        builder.HasKey(x => x.OrderId).HasName("PK_Orders");
        builder.Property(x => x.OrderNumber).HasMaxLength(32).IsRequired();
        builder.Property(x => x.GuestEmail).HasMaxLength(256);
        builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Pending").IsRequired();
        builder.Property(x => x.SubtotalAmount).HasPrecision(18, 2);
        builder.Property(x => x.DiscountAmount).HasPrecision(18, 2).HasDefaultValue(0m);
        builder.Property(x => x.ShippingAmount).HasPrecision(18, 2).HasDefaultValue(0m);
        builder.Property(x => x.TaxAmount).HasPrecision(18, 2).HasDefaultValue(0m);
        builder.Property(x => x.TotalAmount).HasPrecision(18, 2);
        builder.Property(x => x.ShippingName).HasMaxLength(160);
        builder.Property(x => x.ShippingLine1).HasMaxLength(200);
        builder.Property(x => x.ShippingCity).HasMaxLength(100);
        builder.Property(x => x.ShippingRegion).HasMaxLength(100);
        builder.Property(x => x.ShippingPostalCode).HasMaxLength(20);
        builder.Property(x => x.ShippingCountry).HasMaxLength(80);
        builder.Property(x => x.PlacedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.HasIndex(x => x.OrderNumber).IsUnique().HasDatabaseName("UX_Orders_OrderNumber");
        builder.HasIndex(x => new { x.CustomerId, x.PlacedAt }).HasDatabaseName("IX_Orders_CustomerId");
        builder.HasOne(x => x.Customer)
            .WithMany(x => x.Orders)
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_Orders_Customers");
    }
}

internal sealed class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.ToTable("OrderItems", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint("CK_OrderItems_Quantity", "[Quantity] > 0");
            table.HasCheckConstraint(
                "CK_OrderItems_Prices",
                "[UnitPrice] >= 0 AND [DiscountAmount] >= 0 AND [LineTotal] >= 0 AND " +
                "[LineTotal] = ([UnitPrice] * [Quantity] - [DiscountAmount])");
        });
        builder.HasKey(x => x.OrderItemId).HasName("PK_OrderItems");
        builder.Property(x => x.ProductName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Sku).HasMaxLength(64).IsRequired();
        builder.Property(x => x.VariantDetails).HasMaxLength(200);
        builder.Property(x => x.UnitPrice).HasPrecision(18, 2);
        builder.Property(x => x.DiscountAmount).HasPrecision(18, 2).HasDefaultValue(0m);
        builder.Property(x => x.LineTotal).HasPrecision(18, 2);
        builder.HasIndex(x => x.OrderId).HasDatabaseName("IX_OrderItems_OrderId");
        builder.HasIndex(x => x.ProductVariantId)
            .HasDatabaseName("IX_OrderItems_ProductVariantId")
            .HasFilter("[ProductVariantId] IS NOT NULL");
        builder.HasOne(x => x.Order)
            .WithMany(x => x.Items)
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_OrderItems_Orders");
        builder.HasOne(x => x.ProductVariant)
            .WithMany(x => x.OrderItems)
            .HasForeignKey(x => x.ProductVariantId)
            .OnDelete(DeleteBehavior.SetNull)
            .HasConstraintName("FK_OrderItems_ProductVariants");
    }
}

internal sealed class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("Payments", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint("CK_Payments_Amount", "[Amount] > 0");
            table.HasCheckConstraint(
                "CK_Payments_Method",
                "[Method] IN (N'Card', N'COD', N'Wallet', N'BankTransfer')");
            table.HasCheckConstraint(
                "CK_Payments_Status",
                "[Status] IN (N'Pending', N'Authorized', N'Captured', N'Failed', N'Refunded')");
        });
        builder.HasKey(x => x.PaymentId).HasName("PK_Payments");
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.Method).HasMaxLength(30).IsRequired();
        builder.Property(x => x.Provider).HasMaxLength(80);
        builder.Property(x => x.ProviderReference).HasMaxLength(120);
        builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Pending").IsRequired();
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(x => x.ProcessedAt).HasColumnType("datetime2(0)");
        builder.HasIndex(x => new { x.OrderId, x.Status }).HasDatabaseName("IX_Payments_OrderId");
        builder.HasOne(x => x.Order)
            .WithMany(x => x.Payments)
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_Payments_Orders");
    }
}

internal sealed class ShipmentConfiguration : IEntityTypeConfiguration<Shipment>
{
    public void Configure(EntityTypeBuilder<Shipment> builder)
    {
        builder.ToTable("Shipments", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint(
                "CK_Shipments_Status",
                "[Status] IN (N'Pending', N'Packed', N'Shipped', N'Delivered', N'Returned')");
        });
        builder.HasKey(x => x.ShipmentId).HasName("PK_Shipments");
        builder.Property(x => x.Carrier).HasMaxLength(80);
        builder.Property(x => x.TrackingNumber).HasMaxLength(80);
        builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Pending").IsRequired();
        builder.Property(x => x.PackedAt).HasColumnType("datetime2(0)");
        builder.Property(x => x.ShippedAt).HasColumnType("datetime2(0)");
        builder.Property(x => x.DeliveredAt).HasColumnType("datetime2(0)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.HasIndex(x => x.OrderId).HasDatabaseName("IX_Shipments_OrderId");
        builder.HasOne(x => x.Order)
            .WithMany(x => x.Shipments)
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_Shipments_Orders");
    }
}

internal sealed class NewsletterSubscriptionConfiguration : IEntityTypeConfiguration<NewsletterSubscription>
{
    public void Configure(EntityTypeBuilder<NewsletterSubscription> builder)
    {
        builder.ToTable("NewsletterSubscriptions", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint(
                "CK_Newsletter_Status",
                "[Status] IN (N'Subscribed', N'Unsubscribed')");
            table.HasCheckConstraint(
                "CK_Newsletter_UnsubscribeTimestamp",
                "([Status] = N'Subscribed' AND [UnsubscribedAt] IS NULL) OR " +
                "([Status] = N'Unsubscribed' AND [UnsubscribedAt] IS NOT NULL)");
        });
        builder.HasKey(x => x.NewsletterSubscriptionId).HasName("PK_NewsletterSubscriptions");
        builder.Property(x => x.Email).HasMaxLength(256).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Subscribed").IsRequired();
        builder.Property(x => x.SubscribedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(x => x.UnsubscribedAt).HasColumnType("datetime2(0)");
        builder.HasIndex(x => x.Email).IsUnique().HasDatabaseName("UX_NewsletterSubscriptions_Email");
    }
}

internal sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs", "dbo", table =>
        {
            table.ExcludeFromMigrations();
            table.HasCheckConstraint(
                "CK_AuditLogs_Action",
                "[Action] IN (N'Insert', N'Update', N'Delete', N'Login', N'Other')");
        });
        builder.HasKey(x => x.AuditLogId).HasName("PK_AuditLogs");
        builder.Property(x => x.EntityName).HasMaxLength(80).IsRequired();
        builder.Property(x => x.EntityId).HasMaxLength(64);
        builder.Property(x => x.Action).HasMaxLength(20).IsRequired();
        builder.Property(x => x.IdentityUserId).HasMaxLength(450);
        builder.Property(x => x.ChangeSummary).HasMaxLength(1000);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.HasIndex(x => new { x.EntityName, x.EntityId, x.CreatedAt }).HasDatabaseName("IX_AuditLogs_Entity");
    }
}

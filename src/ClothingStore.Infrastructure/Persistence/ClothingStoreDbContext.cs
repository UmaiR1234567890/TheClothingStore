using ClothingStore.Domain.Entities;
using ClothingStore.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.Infrastructure.Persistence;

public sealed class ClothingStoreDbContext
    : IdentityDbContext<ApplicationUser, IdentityRole, string>
{
    public ClothingStoreDbContext(DbContextOptions<ClothingStoreDbContext> options)
        : base(options)
    {
    }

    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Color> Colors => Set<Color>();
    public DbSet<Size> Sizes => Set<Size>();
    public DbSet<SizeGroup> SizeGroups => Set<SizeGroup>();
    public DbSet<ProductAttribute> ProductAttributes => Set<ProductAttribute>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductDepartment> ProductDepartments => Set<ProductDepartment>();
    public DbSet<ProductCategory> ProductCategories => Set<ProductCategory>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<ProductAttributeValue> ProductAttributeValues => Set<ProductAttributeValue>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleProduct> SaleProducts => Set<SaleProduct>();
    public DbSet<SaleScope> SaleScopes => Set<SaleScope>();
    public DbSet<Carrier> Carriers => Set<Carrier>();
    public DbSet<Inventory> Inventory => Set<Inventory>();
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<CustomerAddress> CustomerAddresses => Set<CustomerAddress>();
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<NewsletterSubscription> NewsletterSubscriptions => Set<NewsletterSubscription>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("dbo");
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ApplicationUser>().ToTable("AspNetUsers", "dbo");
        modelBuilder.Entity<IdentityRole>().ToTable("AspNetRoles", "dbo");
        modelBuilder.Entity<IdentityUserRole<string>>().ToTable("AspNetUserRoles", "dbo");
        modelBuilder.Entity<IdentityUserClaim<string>>().ToTable("AspNetUserClaims", "dbo");
        modelBuilder.Entity<IdentityRoleClaim<string>>().ToTable("AspNetRoleClaims", "dbo");
        modelBuilder.Entity<IdentityUserLogin<string>>().ToTable("AspNetUserLogins", "dbo");
        modelBuilder.Entity<IdentityUserToken<string>>().ToTable("AspNetUserTokens", "dbo");

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ClothingStoreDbContext).Assembly);
    }
}

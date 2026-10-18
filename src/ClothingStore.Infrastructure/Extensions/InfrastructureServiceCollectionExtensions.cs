using System.Text;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.Services;
using ClothingStore.Infrastructure.Identity;
using ClothingStore.Infrastructure.Persistence;
using ClothingStore.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ClothingStore.Infrastructure.Extensions;

public static class InfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddClothingStoreInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("TheClothingStore");
        services.AddDbContext<ClothingStoreDbContext>(options =>
            options.UseSqlServer(connectionString ?? string.Empty));
        services.AddHttpContextAccessor();

        services.AddIdentityCore<ApplicationUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequiredLength = 10;
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = true;
                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.SignIn.RequireConfirmedEmail = false;
            })
            .AddRoles<IdentityRole>()
            .AddSignInManager()
            .AddEntityFrameworkStores<ClothingStoreDbContext>()
            .AddDefaultTokenProviders();

        services.AddOptions<JwtSettings>()
            .Bind(configuration.GetSection("Jwt"))
            .Validate(x => !string.IsNullOrWhiteSpace(x.Issuer), "Jwt:Issuer is required.")
            .Validate(x => !string.IsNullOrWhiteSpace(x.Audience), "Jwt:Audience is required.")
            .Validate(x => Encoding.UTF8.GetByteCount(x.SigningKey ?? string.Empty) >= 32,
                "Jwt:SigningKey must contain at least 32 UTF-8 bytes.")
            .Validate(x => x.AccessTokenMinutes is >= 5 and <= 30, "Access tokens must expire within 5-30 minutes.")
            .ValidateOnStart();

        services.AddSingleton<IPricingCalculator, PricingCalculator>();
        services.AddScoped<EffectivePriceResolver>();
        services.AddScoped<AuditLogWriter>();
        services.AddScoped<ICatalogService, CatalogService>();
        services.AddScoped<ICatalogAdminService, CatalogAdminService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<ICartService, CartService>();
        services.AddScoped<ICheckoutService, CheckoutService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddSingleton<IPaymentProvider, CashOnDeliveryPaymentProvider>();
        services.AddScoped<INewsletterService, NewsletterService>();
        services.AddScoped<IPricingAdminService, PricingAdminService>();
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<IShipmentService, ShipmentService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IAdminProvisioningService, AdminProvisioningService>();
        return services;
    }
}

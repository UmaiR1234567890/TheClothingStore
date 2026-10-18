using ClothingStore.Application.Contracts;
using Microsoft.Extensions.DependencyInjection;

namespace ClothingStore.IntegrationTests.Api;

public sealed class ServiceResolutionTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public ServiceResolutionTests(ApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public void AllApplicationServicesResolveFromDependencyInjection()
    {
        using var scope = _factory.Services.CreateScope();
        var services = scope.ServiceProvider;

        Assert.NotNull(services.GetRequiredService<ICatalogService>());
        Assert.NotNull(services.GetRequiredService<ICatalogAdminService>());
        Assert.NotNull(services.GetRequiredService<IAuthService>());
        Assert.NotNull(services.GetRequiredService<ICustomerService>());
        Assert.NotNull(services.GetRequiredService<ICartService>());
        Assert.NotNull(services.GetRequiredService<ICheckoutService>());
        Assert.NotNull(services.GetRequiredService<IOrderService>());
        Assert.NotNull(services.GetRequiredService<IPaymentService>());
        Assert.NotNull(services.GetRequiredService<INewsletterService>());
        Assert.NotNull(services.GetRequiredService<IPricingAdminService>());
        Assert.NotNull(services.GetRequiredService<IInventoryService>());
        Assert.NotNull(services.GetRequiredService<IShipmentService>());
        Assert.NotNull(services.GetRequiredService<IDashboardService>());
        Assert.Single(services.GetServices<IPaymentProvider>());
    }
}

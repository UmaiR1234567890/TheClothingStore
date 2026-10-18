using ClothingStore.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ClothingStore.IntegrationTests.Api;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly IReadOnlyDictionary<string, string?> _previousEnvironment = new Dictionary<string, string?>
    {
        ["ConnectionStrings__TheClothingStore"] = Environment.GetEnvironmentVariable("ConnectionStrings__TheClothingStore"),
        ["Jwt__Issuer"] = Environment.GetEnvironmentVariable("Jwt__Issuer"),
        ["Jwt__Audience"] = Environment.GetEnvironmentVariable("Jwt__Audience"),
        ["Jwt__SigningKey"] = Environment.GetEnvironmentVariable("Jwt__SigningKey"),
        ["Jwt__AccessTokenMinutes"] = Environment.GetEnvironmentVariable("Jwt__AccessTokenMinutes")
    };

    public ApiFactory()
    {
        Environment.SetEnvironmentVariable("ConnectionStrings__TheClothingStore", "Server=(local);Database=TestOnly");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "TheClothingStore.Tests");
        Environment.SetEnvironmentVariable("Jwt__Audience", "TheClothingStore.Tests.Client");
        Environment.SetEnvironmentVariable("Jwt__SigningKey", "only-for-isolated-tests-signing-key-32-bytes");
        Environment.SetEnvironmentVariable("Jwt__AccessTokenMinutes", "15");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:TheClothingStore"] = "Server=(local);Database=TestOnly",
                ["Jwt:Issuer"] = "TheClothingStore.Tests",
                ["Jwt:Audience"] = "TheClothingStore.Tests.Client",
                ["Jwt:SigningKey"] = "only-for-isolated-tests-signing-key-32-bytes",
                ["Jwt:AccessTokenMinutes"] = "15"
            });
        });
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<ClothingStoreDbContext>>();
            services.RemoveAll<ClothingStoreDbContext>();
            services.AddDbContext<ClothingStoreDbContext>(options =>
                options.UseInMemoryDatabase($"ClothingStoreTests-{Guid.NewGuid():N}"));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (!disposing)
            return;
        foreach (var pair in _previousEnvironment)
            Environment.SetEnvironmentVariable(pair.Key, pair.Value);
    }
}

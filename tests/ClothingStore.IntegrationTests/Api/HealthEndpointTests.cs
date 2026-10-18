using System.Net;
using System.Net.Http.Json;
using ClothingStore.Application.DTOs;

namespace ClothingStore.IntegrationTests.Api;

public sealed class HealthEndpointTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(ApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task HealthEndpointReturnsSafeSuccessEnvelope()
    {
        var response = await _client.GetAsync("/api/v1/health");
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<Dictionary<string, string>>>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(payload);
        Assert.True(payload.Success);
        Assert.Equal("healthy", payload.Data!["status"]);
    }

    [Fact]
    public async Task ProtectedCurrentUserEndpointRequiresAuthentication()
    {
        var response = await _client.GetAsync("/api/v1/auth/me");
        var payload = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.NotNull(payload);
        Assert.False(payload.Success);
    }

    [Fact]
    public async Task AdminEndpointsRequireAuthentication()
    {
        var response = await _client.GetAsync("/api/v1/admin/products");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ReadinessEndpointUsesTheIsolatedTestDatabase()
    {
        var response = await _client.GetAsync("/api/v1/health/ready");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}

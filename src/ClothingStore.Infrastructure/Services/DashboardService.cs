using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.Infrastructure.Services;

internal sealed class DashboardService(ClothingStoreDbContext db) : IDashboardService
{
    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken cancellationToken)
    {
        var products = await db.Products.CountAsync(x => x.Status == "Active" && !x.IsDeleted, cancellationToken);
        var customers = await db.Customers.CountAsync(x => !x.IsDeleted, cancellationToken);
        var pendingOrders = await db.Orders.CountAsync(x => x.Status == "Pending", cancellationToken);
        var revenue = await db.Payments
            .Where(x => x.Status == "Captured")
            .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;
        return new DashboardSummaryDto(products, customers, pendingOrders, decimal.Round(revenue, 2));
    }
}

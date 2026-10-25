using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using ClothingStore.Application.Services;
using ClothingStore.Domain.Entities;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.Infrastructure.Services;

internal sealed class EffectivePriceResolver(
    ClothingStoreDbContext db,
    IPricingCalculator calculator)
{
    public async Task<IReadOnlyDictionary<int, EffectivePrice>> ResolveAsync(
        IReadOnlyCollection<ProductVariant> variants,
        CancellationToken cancellationToken)
    {
        var productIds = variants.Select(x => x.ProductId).Distinct().ToArray();
        var now = DateTime.UtcNow;
        var offers = await db.SaleProducts
            .AsNoTracking()
            .Where(x => productIds.Contains(x.ProductId) &&
                        x.Sale.IsActive &&
                        !x.Sale.IsDeleted &&
                        (x.Sale.StartsAt == null || x.Sale.StartsAt <= now) &&
                        (x.Sale.EndsAt == null || x.Sale.EndsAt >= now))
            .Select(x => new
            {
                x.ProductId,
                Candidate = new DiscountCandidate(
                    x.Sale.Name,
                    x.Sale.DiscountType,
                    x.Sale.DiscountValue,
                    x.Sale.StartsAt,
                    x.Sale.EndsAt,
                    x.Sale.IsActive,
                    x.Sale.IsDeleted)
            })
            .ToListAsync(cancellationToken);

        // Scopes target whole departments/categories (or the whole store when
        // both ids are null). Resolve each product's memberships once, then map
        // matching scoped offers back onto the product ids.
        var categoryPairs = await db.ProductCategories.AsNoTracking()
            .Where(x => productIds.Contains(x.ProductId))
            .Select(x => new { x.ProductId, x.CategoryId })
            .ToListAsync(cancellationToken);
        var departmentPairs = await db.ProductDepartments.AsNoTracking()
            .Where(x => productIds.Contains(x.ProductId))
            .Select(x => new { x.ProductId, x.DepartmentId })
            .ToListAsync(cancellationToken);
        var scopes = await db.SaleScopes.AsNoTracking()
            .Where(x => x.Sale.IsActive &&
                        !x.Sale.IsDeleted &&
                        (x.Sale.StartsAt == null || x.Sale.StartsAt <= now) &&
                        (x.Sale.EndsAt == null || x.Sale.EndsAt >= now))
            .Select(x => new
            {
                x.DepartmentId,
                x.CategoryId,
                Candidate = new DiscountCandidate(
                    x.Sale.Name,
                    x.Sale.DiscountType,
                    x.Sale.DiscountValue,
                    x.Sale.StartsAt,
                    x.Sale.EndsAt,
                    x.Sale.IsActive,
                    x.Sale.IsDeleted)
            })
            .ToListAsync(cancellationToken);

        var categoriesByProduct = categoryPairs
            .GroupBy(x => x.ProductId)
            .ToDictionary(x => x.Key, x => x.Select(y => y.CategoryId).ToHashSet());
        var departmentsByProduct = departmentPairs
            .GroupBy(x => x.ProductId)
            .ToDictionary(x => x.Key, x => x.Select(y => y.DepartmentId).ToHashSet());

        var candidatesByProduct = offers
            .GroupBy(x => x.ProductId)
            .ToDictionary(x => x.Key, x => x.Select(y => y.Candidate).ToList());
        foreach (var productId in productIds)
        {
            var categoryIds = categoriesByProduct.GetValueOrDefault(productId) ?? [];
            var departmentIds = departmentsByProduct.GetValueOrDefault(productId) ?? [];
            var scoped = scopes
                .Where(x =>
                    (x.CategoryId == null && x.DepartmentId == null) ||
                    (x.CategoryId.HasValue && categoryIds.Contains(x.CategoryId.Value)) ||
                    (x.DepartmentId.HasValue && departmentIds.Contains(x.DepartmentId.Value)))
                .Select(x => x.Candidate);
            if (!candidatesByProduct.TryGetValue(productId, out var list))
            {
                list = [];
                candidatesByProduct[productId] = list;
            }
            list.AddRange(scoped);
        }

        return variants.ToDictionary(
            x => x.ProductVariantId,
            x => calculator.Calculate(
                x.RegularPrice,
                candidatesByProduct.GetValueOrDefault(x.ProductId) ?? [],
                now));
    }

    public static VariantOptionDto ToOptions(ProductVariant variant) =>
        new(
            variant.ColorId,
            variant.Color?.Name,
            variant.SizeId,
            variant.Size?.Name,
            variant.Size?.SizeType,
            variant.VolumeMl);

    public static int Available(ProductVariant variant) =>
        variant.Inventory is null
            ? 0
            : InventoryRules.Available(variant.Inventory.QuantityOnHand, variant.Inventory.QuantityReserved);

    public static ProductVariantDto ToDto(ProductVariant variant, EffectivePrice price)
    {
        var available = Available(variant);
        return new ProductVariantDto(
            variant.ProductVariantId,
            variant.Sku,
            ToOptions(variant),
            variant.IsActive,
            variant.IsDeleted,
            variant.RegularPrice,
            price.Amount,
            price.IsOnSale,
            available,
            available > 0,
            price.SaleName,
            price.SaleEndsAt);
    }
}

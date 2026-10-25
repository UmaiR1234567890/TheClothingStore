using ClothingStore.Application.Contracts;
using ClothingStore.Domain.Constants;

namespace ClothingStore.Application.Services;

public sealed class PricingCalculator : IPricingCalculator
{
    public EffectivePrice Calculate(decimal regularPrice, IEnumerable<DiscountCandidate> candidates, DateTime utcNow)
    {
        if (regularPrice < 0)
            throw new ArgumentOutOfRangeException(nameof(regularPrice));

        var bestPrice = regularPrice;
        string? bestSale = null;
        DateTime? bestSaleEndsAt = null;

        foreach (var sale in candidates)
        {
            if (!sale.IsActive || sale.IsDeleted ||
                sale.StartsAt is { } start && AsUtc(start) > utcNow ||
                sale.EndsAt is { } end && AsUtc(end) < utcNow)
            {
                continue;
            }

            decimal candidate;
            if (sale.DiscountType == DiscountTypes.Percentage &&
                sale.DiscountValue is >= 0 and <= 100)
            {
                candidate = Math.Round(
                    regularPrice * (1m - sale.DiscountValue / 100m),
                    2,
                    MidpointRounding.AwayFromZero);
            }
            else if (sale.DiscountType == DiscountTypes.FixedAmount && sale.DiscountValue > 0)
            {
                candidate = Math.Max(0m, regularPrice - sale.DiscountValue);
            }
            else
            {
                continue;
            }

            if (candidate < bestPrice)
            {
                bestPrice = candidate;
                bestSale = sale.Name;
                bestSaleEndsAt = sale.EndsAt;
            }
        }

        return new EffectivePrice(bestPrice, bestSale is not null, bestSale, bestSaleEndsAt);
    }

    private static DateTime AsUtc(DateTime value) =>
        value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
}

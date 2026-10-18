using ClothingStore.Application.Contracts;
using ClothingStore.Application.Services;
using ClothingStore.Domain.Constants;

namespace ClothingStore.UnitTests.Services;

public sealed class PricingCalculatorTests
{
    private readonly PricingCalculator _calculator = new();

    [Fact]
    public void CalculatesPercentageDiscountFromRegularPrice()
    {
        var now = new DateTime(2026, 10, 18, 12, 0, 0, DateTimeKind.Utc);
        var result = _calculator.Calculate(
            3490m,
            [Offer(DiscountTypes.Percentage, 20m, now)],
            now);

        Assert.Equal(2792m, result.Amount);
        Assert.True(result.IsOnSale);
    }

    [Fact]
    public void ChoosesLowestEligibleEffectivePriceAndFloorsFixedDiscountAtZero()
    {
        var now = new DateTime(2026, 10, 18, 12, 0, 0, DateTimeKind.Utc);
        var result = _calculator.Calculate(
            500m,
            [
                Offer(DiscountTypes.FixedAmount, 100m, now, "Fixed"),
                Offer(DiscountTypes.Percentage, 80m, now, "Percent")
            ],
            now);

        Assert.Equal(100m, result.Amount);
        Assert.Equal("Percent", result.SaleName);
    }

    [Fact]
    public void SaleWindowIncludesStartAndEndInstants()
    {
        var now = new DateTime(2026, 10, 18, 12, 0, 0, DateTimeKind.Utc);
        var offer = new DiscountCandidate(
            "Boundary",
            DiscountTypes.FixedAmount,
            10m,
            now,
            now,
            IsActive: true,
            IsDeleted: false);

        var result = _calculator.Calculate(100m, [offer], now);

        Assert.Equal(90m, result.Amount);
    }

    [Fact]
    public void IgnoresInactiveDeletedAndInvalidOffers()
    {
        var now = new DateTime(2026, 10, 18, 12, 0, 0, DateTimeKind.Utc);
        var offers = new[]
        {
            Offer(DiscountTypes.FixedAmount, 90m, now, "Inactive", active: false),
            Offer(DiscountTypes.FixedAmount, 90m, now, "Deleted", deleted: true),
            Offer(DiscountTypes.Percentage, 150m, now, "Invalid")
        };

        var result = _calculator.Calculate(100m, offers, now);

        Assert.Equal(100m, result.Amount);
        Assert.False(result.IsOnSale);
    }

    [Fact]
    public void UsesRegularPriceWhenNoSaleIsEligible()
    {
        var now = new DateTime(2026, 10, 18, 12, 0, 0, DateTimeKind.Utc);
        var offer = new DiscountCandidate(
            "Future",
            DiscountTypes.Percentage,
            25m,
            now.AddMinutes(1),
            null,
            IsActive: true,
            IsDeleted: false);

        var result = _calculator.Calculate(1234.56m, [offer], now);

        Assert.Equal(1234.56m, result.Amount);
        Assert.Null(result.SaleName);
    }

    private static DiscountCandidate Offer(
        string type,
        decimal value,
        DateTime now,
        string name = "Test",
        bool active = true,
        bool deleted = false) =>
        new(name, type, value, now.AddHours(-1), now.AddHours(1), active, deleted);
}

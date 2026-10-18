using ClothingStore.Application.DTOs;
using ClothingStore.Application.Services;

namespace ClothingStore.UnitTests.Services;

public sealed class InventoryRulesTests
{
    [Fact]
    public void AvailableStockSubtractsReservations()
    {
        Assert.Equal(12, InventoryRules.Available(20, 8));
    }

    [Fact]
    public void FulfillmentRequiresPositiveRequestedQuantityWithinAvailableStock()
    {
        Assert.True(InventoryRules.CanFulfill(10, 2, 8));
        Assert.False(InventoryRules.CanFulfill(10, 2, 9));
        Assert.False(InventoryRules.CanFulfill(10, 2, 0));
    }

    [Fact]
    public void ManualAdjustmentCannotDropBelowReservedQuantity()
    {
        var exception = Assert.Throws<ServiceException>(() =>
            InventoryRules.ApplyAdjustment(onHand: 10, reserved: 4, change: -7));

        Assert.Equal(409, exception.StatusCode);
    }

    [Fact]
    public void CartMergeRejectsQuantityAboveStockOrPerVariantLimit()
    {
        Assert.Equal(5, CartQuantityRules.Merge(existing: 2, incoming: 3, quantityAvailable: 5));
        Assert.Throws<ServiceException>(() =>
            CartQuantityRules.Merge(existing: 4, incoming: 2, quantityAvailable: 5));
        Assert.Throws<ServiceException>(() =>
            CartQuantityRules.Merge(existing: 99, incoming: 2, quantityAvailable: 200));
    }
}

using ClothingStore.Application.DTOs;

namespace ClothingStore.Application.Services;

public static class InventoryRules
{
    public static int Available(int onHand, int reserved)
    {
        if (onHand < 0 || reserved < 0 || reserved > onHand)
            throw new ArgumentOutOfRangeException(nameof(onHand), "Inventory quantities are inconsistent.");
        return onHand - reserved;
    }

    public static bool CanFulfill(int onHand, int reserved, int requested) =>
        requested > 0 && Available(onHand, reserved) >= requested;

    public static int ApplyAdjustment(int onHand, int reserved, int change)
    {
        if (change == 0)
            throw new ServiceException(400, "zero_adjustment", "Inventory adjustment must change stock.");
        int adjusted;
        try
        {
            adjusted = checked(onHand + change);
        }
        catch (OverflowException)
        {
            throw new ServiceException(400, "invalid_adjustment", "The requested stock adjustment is outside the supported range.");
        }
        if (adjusted < reserved)
            throw new ServiceException(409, "insufficient_available_stock", "The adjustment would reduce on-hand stock below reserved stock.");
        return adjusted;
    }
}

public static class CartQuantityRules
{
    public const int MaximumQuantityPerVariant = 100;

    public static int Merge(int existing, int incoming, int quantityAvailable)
    {
        if (existing < 0 || incoming < 1 || incoming > MaximumQuantityPerVariant)
            throw new ServiceException(400, "invalid_quantity", "Cart quantities must be between 1 and 100.");
        int merged;
        try
        {
            merged = checked(existing + incoming);
        }
        catch (OverflowException)
        {
            throw new ServiceException(400, "invalid_quantity", "The merged cart quantity is too large.");
        }
        if (merged > MaximumQuantityPerVariant)
            throw new ServiceException(400, "invalid_quantity", "Cart quantity cannot exceed 100 per variant.");
        if (merged > quantityAvailable)
            throw new ServiceException(409, "insufficient_stock", "The requested quantity is not currently available.");
        return merged;
    }
}

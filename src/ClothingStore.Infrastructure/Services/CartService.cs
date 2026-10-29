using System.Data;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using ClothingStore.Application.Services;
using ClothingStore.Domain.Entities;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.Infrastructure.Services;

internal sealed class CartService(
    ClothingStoreDbContext db,
    EffectivePriceResolver prices) : ICartService
{
    public async Task<(CartDto Cart, Guid? GuestToken)> GetAsync(
        int? customerId,
        Guid? guestToken,
        CancellationToken cancellationToken)
    {
        var (cart, token) = await GetOrCreateAsync(customerId, guestToken, cancellationToken);
        return (await ToDtoAsync(cart.CartId, cancellationToken), token);
    }

    public async Task<CartDto> AddItemAsync(
        int? customerId,
        Guid? guestToken,
        AddCartItemRequest request,
        CancellationToken cancellationToken)
    {
        var (cart, _) = await GetOrCreateAsync(customerId, guestToken, cancellationToken);
        var variant = await LoadVariantAsync(request.ProductVariantId, cancellationToken);
        var existing = await db.CartItems.SingleOrDefaultAsync(
            x => x.CartId == cart.CartId && x.ProductVariantId == variant.ProductVariantId,
            cancellationToken);
        var quantity = CartQuantityRules.Merge(
            existing?.Quantity ?? 0,
            request.Quantity,
            EffectivePriceResolver.Available(variant));

        if (existing is null)
        {
            db.CartItems.Add(new CartItem
            {
                CartId = cart.CartId,
                ProductVariantId = variant.ProductVariantId,
                Quantity = quantity
            });
        }
        else
        {
            existing.Quantity = quantity;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);
        return await ToDtoAsync(cart.CartId, cancellationToken);
    }

    public async Task<CartDto> UpdateItemAsync(
        int? customerId,
        Guid? guestToken,
        int cartItemId,
        int quantity,
        CancellationToken cancellationToken)
    {
        if (quantity is < 1 or > 100)
            throw new ServiceException(400, "invalid_quantity", "Quantity must be between 1 and 100.");
        var cart = await FindRequiredCartAsync(customerId, guestToken, cancellationToken);
        var item = await db.CartItems
            .Include(x => x.ProductVariant).ThenInclude(x => x.Inventory)
            .SingleOrDefaultAsync(x => x.CartItemId == cartItemId && x.CartId == cart.CartId, cancellationToken);
        if (item is null)
            throw new ServiceException(404, "cart_item_not_found", "Cart item was not found.");

        var variant = await LoadVariantAsync(item.ProductVariantId, cancellationToken);
        CartQuantityRules.Merge(0, quantity, EffectivePriceResolver.Available(variant));
        item.Quantity = quantity;
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return await ToDtoAsync(cart.CartId, cancellationToken);
    }

    public async Task RemoveItemAsync(
        int? customerId,
        Guid? guestToken,
        int cartItemId,
        CancellationToken cancellationToken)
    {
        var cart = await FindRequiredCartAsync(customerId, guestToken, cancellationToken);
        var item = await db.CartItems.SingleOrDefaultAsync(
            x => x.CartId == cart.CartId && x.CartItemId == cartItemId,
            cancellationToken);
        if (item is null)
            throw new ServiceException(404, "cart_item_not_found", "Cart item was not found.");
        db.CartItems.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task ClearAsync(int? customerId, Guid? guestToken, CancellationToken cancellationToken)
    {
        var cart = await FindRequiredCartAsync(customerId, guestToken, cancellationToken);
        var items = await db.CartItems.Where(x => x.CartId == cart.CartId).ToListAsync(cancellationToken);
        db.CartItems.RemoveRange(items);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<CartDto> MergeAsync(int customerId, Guid guestToken, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var guestCart = await LoadLockedCartAsync(null, guestToken, cancellationToken);
        var customerCart = await LoadLockedCartAsync(customerId, null, cancellationToken);
        if (customerCart is null)
        {
            customerCart = new Cart { CustomerId = customerId };
            db.Carts.Add(customerCart);
            await db.SaveChangesAsync(cancellationToken);
        }

        if (guestCart is null)
        {
            await transaction.CommitAsync(cancellationToken);
            return await ToDtoAsync(customerCart.CartId, cancellationToken);
        }

        var guestItems = await db.CartItems
            .Where(x => x.CartId == guestCart.CartId)
            .Include(x => x.ProductVariant).ThenInclude(x => x.Product)
            .Include(x => x.ProductVariant).ThenInclude(x => x.Inventory)
            .ToListAsync(cancellationToken);
        var targetItems = await db.CartItems.Where(x => x.CartId == customerCart.CartId).ToListAsync(cancellationToken);

        foreach (var source in guestItems)
        {
            var variant = await LoadVariantAsync(source.ProductVariantId, cancellationToken);
            var target = targetItems.SingleOrDefault(x => x.ProductVariantId == source.ProductVariantId);
            var mergedQuantity = CartQuantityRules.Merge(
                target?.Quantity ?? 0,
                source.Quantity,
                EffectivePriceResolver.Available(variant));
            if (target is null)
            {
                db.CartItems.Add(new CartItem
                {
                    CartId = customerCart.CartId,
                    ProductVariantId = source.ProductVariantId,
                    Quantity = mergedQuantity
                });
            }
            else
            {
                target.Quantity = mergedQuantity;
                target.UpdatedAt = DateTime.UtcNow;
            }
        }

        db.Carts.Remove(guestCart);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return await ToDtoAsync(customerCart.CartId, cancellationToken);
    }

    private async Task<(Cart Cart, Guid? GuestToken)> GetOrCreateAsync(
        int? customerId,
        Guid? guestToken,
        CancellationToken cancellationToken)
    {
        if (customerId.HasValue)
        {
            var customerCart = await FindCartAsync(customerId, null, cancellationToken);
            if (customerCart is not null)
                return (customerCart, null);
            var created = await CreateCartWithLockAsync(customerId, null, cancellationToken);
            return (created, null);
        }

        var token = guestToken is { } supplied && supplied != Guid.Empty ? supplied : Guid.NewGuid();
        var guestCart = await FindCartAsync(null, token, cancellationToken);
        if (guestCart is null)
            guestCart = await CreateCartWithLockAsync(null, token, cancellationToken);
        return (guestCart, token);
    }

    private async Task<Cart?> FindCartAsync(int? customerId, Guid? guestToken, CancellationToken cancellationToken)
    {
        if (customerId.HasValue)
            return await db.Carts.SingleOrDefaultAsync(x => x.CustomerId == customerId.Value, cancellationToken);
        if (guestToken.HasValue)
            return await db.Carts.SingleOrDefaultAsync(x => x.GuestToken == guestToken.Value, cancellationToken);
        throw new ServiceException(400, "cart_owner_required", "An authenticated customer or guest cart token is required.");
    }

    private async Task<Cart> FindRequiredCartAsync(
        int? customerId,
        Guid? guestToken,
        CancellationToken cancellationToken) =>
        await FindCartAsync(customerId, guestToken, cancellationToken)
        ?? throw new ServiceException(404, "cart_not_found", "Cart was not found.");

    private async Task<Cart> CreateCartWithLockAsync(
        int? customerId,
        Guid? guestToken,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var existing = await LoadLockedCartAsync(customerId, guestToken, cancellationToken);
        if (existing is not null)
        {
            await transaction.CommitAsync(cancellationToken);
            return existing;
        }

        var cart = new Cart { CustomerId = customerId, GuestToken = guestToken };
        db.Carts.Add(cart);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return cart;
    }

    private Task<Cart?> LoadLockedCartAsync(int? customerId, Guid? guestToken, CancellationToken cancellationToken)
    {
        if (customerId.HasValue)
        {
            return db.Carts.FromSqlInterpolated(
                    $"SELECT * FROM dbo.Carts WITH (UPDLOCK, HOLDLOCK) WHERE CustomerId = {customerId.Value}")
                .SingleOrDefaultAsync(cancellationToken);
        }
        if (guestToken.HasValue)
        {
            return db.Carts.FromSqlInterpolated(
                    $"SELECT * FROM dbo.Carts WITH (UPDLOCK, HOLDLOCK) WHERE GuestToken = {guestToken.Value}")
                .SingleOrDefaultAsync(cancellationToken);
        }
        throw new ServiceException(400, "cart_owner_required", "An authenticated customer or guest cart token is required.");
    }

    private async Task<ProductVariant> LoadVariantAsync(int variantId, CancellationToken cancellationToken)
    {
        var variant = await db.ProductVariants
            .Include(x => x.Product)
            .Include(x => x.Inventory)
            .Include(x => x.Color)
            .Include(x => x.Size)
            .SingleOrDefaultAsync(x =>
                x.ProductVariantId == variantId &&
                x.IsActive && !x.IsDeleted &&
                x.Product.Status == "Active" && !x.Product.IsDeleted,
                cancellationToken);
        return variant ?? throw new ServiceException(404, "variant_not_available", "The product variant is not available.");
    }

    private async Task<CartDto> ToDtoAsync(int cartId, CancellationToken cancellationToken)
    {
        var items = await db.CartItems.AsNoTracking()
            .Where(x => x.CartId == cartId)
            .Include(x => x.ProductVariant).ThenInclude(x => x.Product).ThenInclude(x => x.Images)
            .Include(x => x.ProductVariant).ThenInclude(x => x.Inventory)
            .Include(x => x.ProductVariant).ThenInclude(x => x.Color)
            .Include(x => x.ProductVariant).ThenInclude(x => x.Size)
            .OrderBy(x => x.CartItemId)
            .ToListAsync(cancellationToken);
        var variantEntities = items.Select(x => x.ProductVariant).ToArray();
        var resolved = await prices.ResolveAsync(variantEntities, cancellationToken);
        var lines = items.Select(item =>
        {
            var variant = item.ProductVariant;
            var price = resolved[variant.ProductVariantId].Amount;
            var variantIsActive = variant.IsActive && !variant.IsDeleted &&
                                  variant.Product.Status == "Active" && !variant.Product.IsDeleted;
            var quantityAvailable = variantIsActive ? EffectivePriceResolver.Available(variant) : 0;
            var imageUrl = variant.Product.Images
                .Where(image => image.ColorId == variant.ColorId || image.ColorId == null)
                .OrderByDescending(image => image.IsPrimary).ThenBy(image => image.DisplayOrder)
                .Select(image => image.ImageUrl)
                .FirstOrDefault();
            return new CartLineDto(
                item.CartItemId,
                variant.ProductVariantId,
                variant.Product.Name,
                variant.Sku,
                variant.Product.Slug,
                imageUrl,
                EffectivePriceResolver.ToOptions(variant),
                item.Quantity,
                price,
                decimal.Round(price * item.Quantity, 2),
                quantityAvailable,
                variantIsActive && quantityAvailable >= item.Quantity);
        }).ToArray();

        return new CartDto(
            cartId,
            lines,
            decimal.Round(lines.Sum(x => x.LineTotal), 2),
            lines.Sum(x => x.Quantity));
    }
}

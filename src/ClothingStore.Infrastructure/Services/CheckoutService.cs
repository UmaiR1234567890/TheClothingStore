using System.Data;
using System.Security.Cryptography;
using System.Text;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using ClothingStore.Application.Services;
using ClothingStore.Domain.Constants;
using ClothingStore.Domain.Entities;
using ClothingStore.Infrastructure.Email;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ClothingStore.Infrastructure.Services;

internal sealed class CheckoutService(
    ClothingStoreDbContext db,
    EffectivePriceResolver prices,
    IEnumerable<IPaymentProvider> paymentProviders,
    IEmailSender emails,
    ILogger<CheckoutService> logger) : ICheckoutService
{
    public async Task<CheckoutValidationDto> ValidateAsync(
        int? customerId,
        Guid? guestToken,
        CheckoutRequest request,
        CancellationToken cancellationToken)
    {
        var issues = new List<string>();
        if (request.IdempotencyKey == Guid.Empty)
            issues.Add("A non-empty Idempotency-Key is required.");
        if (FindProvider(request.PaymentMethod) is null)
            issues.Add("The requested payment method is not configured.");

        var shipping = await ResolveShippingAsync(customerId, request, cancellationToken);
        issues.AddRange(shipping.Errors);
        var cart = await FindCartAsync(customerId, guestToken, cancellationToken);
        if (cart is null)
            issues.Add("The cart was not found.");

        var items = cart is null
            ? []
            : await LoadCartItemsAsync(cart.CartId, cancellationToken);
        if (items.Count == 0)
            issues.Add("The cart is empty.");

        var variants = items.Select(x => x.ProductVariant).ToArray();
        var priceMap = variants.Length == 0
            ? new Dictionary<int, EffectivePrice>()
            : await prices.ResolveAsync(variants, cancellationToken);
        decimal subtotal = 0;
        decimal discount = 0;
        foreach (var item in items)
        {
            if (!IsPurchasable(item.ProductVariant))
            {
                issues.Add($"Variant {item.ProductVariant.Sku} is no longer available.");
                continue;
            }
            var available = EffectivePriceResolver.Available(item.ProductVariant);
            if (item.Quantity > available)
                issues.Add($"Insufficient stock for variant {item.ProductVariant.Sku}.");
            var unit = priceMap[item.ProductVariantId].Amount;
            subtotal += item.ProductVariant.RegularPrice * item.Quantity;
            discount += (item.ProductVariant.RegularPrice - unit) * item.Quantity;
        }

        subtotal = decimal.Round(subtotal, 2);
        discount = decimal.Round(discount, 2);
        return new CheckoutValidationDto(
            issues.Count == 0,
            issues,
            subtotal,
            discount,
            0m,
            0m,
            decimal.Round(subtotal - discount, 2));
    }

    public async Task<CheckoutResultDto> CheckoutAsync(
        int? customerId,
        Guid? guestToken,
        CheckoutRequest request,
        CancellationToken cancellationToken)
    {
        if (customerId is null && guestToken is null)
            throw new ServiceException(400, "cart_owner_required", "An authenticated customer or guest cart token is required.");
        if (customerId is null && string.IsNullOrWhiteSpace(request.GuestEmail))
            throw new ServiceException(400, "guest_email_required", "Guest checkout requires an email address.");
        if (request.IdempotencyKey == Guid.Empty)
            throw new ServiceException(400, "idempotency_key_required", "A non-empty Idempotency-Key is required.");
        var paymentProvider = FindProvider(request.PaymentMethod)
            ?? throw new ServiceException(503, "payment_provider_unavailable", "The requested payment provider is not configured.");

        var (orderNumber, fingerprint) = CreateOrderNumber(customerId, guestToken, request.IdempotencyKey);
        var prior = await LoadOrderByFingerprintAsync(fingerprint, cancellationToken);
        if (prior is not null)
            return EnsureOwnerAndMap(prior, customerId, request.GuestEmail);

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        try
        {
            await db.Database.ExecuteSqlInterpolatedAsync(
                $"DECLARE @lockResult int; EXEC @lockResult = sys.sp_getapplock @Resource = {string.Concat("checkout:", fingerprint)}, @LockMode = N'Exclusive', @LockOwner = N'Transaction', @LockTimeout = 10000; IF @lockResult < 0 THROW 51010, N'Could not acquire checkout idempotency lock.', 1;",
                cancellationToken);
            prior = await LoadOrderByFingerprintAsync(fingerprint, cancellationToken);
            if (prior is not null)
            {
                await transaction.CommitAsync(cancellationToken);
                return EnsureOwnerAndMap(prior, customerId, request.GuestEmail);
            }

            var shipping = await ResolveShippingAsync(customerId, request, cancellationToken);
            if (shipping.Errors.Count > 0)
                throw new ServiceException(400, "invalid_shipping", string.Join(" ", shipping.Errors));

            var cart = await FindCartAsync(customerId, guestToken, cancellationToken)
                ?? throw new ServiceException(404, "cart_not_found", "The cart was not found.");
            var items = await LoadCartItemsAsync(cart.CartId, cancellationToken);
            if (items.Count == 0)
                throw new ServiceException(409, "cart_empty", "The cart is empty.");

            foreach (var item in items)
            {
                if (!IsPurchasable(item.ProductVariant))
                    throw new ServiceException(409, "variant_unavailable", $"Variant {item.ProductVariant.Sku} is no longer available.");
            }

            var lockedInventory = new Dictionary<int, Inventory>();
            foreach (var item in items.OrderBy(x => x.ProductVariantId))
            {
                var inventory = await db.Inventory
                    .FromSqlInterpolated(
                        $"SELECT * FROM dbo.Inventory WITH (UPDLOCK, ROWLOCK) WHERE ProductVariantId = {item.ProductVariantId}")
                    .AsNoTracking()
                    .SingleOrDefaultAsync(cancellationToken);
                if (inventory is null ||
                    !InventoryRules.CanFulfill(inventory.QuantityOnHand, inventory.QuantityReserved, item.Quantity))
                    throw new ServiceException(409, "insufficient_stock", $"Insufficient stock for variant {item.ProductVariant.Sku}.");
                lockedInventory.Add(item.ProductVariantId, inventory);
            }

            var variantEntities = items.Select(x => x.ProductVariant).ToArray();
            var priceMap = await prices.ResolveAsync(variantEntities, cancellationToken);
            var now = DateTime.UtcNow;
            var orderItems = items.Select(item =>
            {
                var variant = item.ProductVariant;
                var price = priceMap[variant.ProductVariantId].Amount;
                var discountPerUnit = decimal.Round(variant.RegularPrice - price, 2);
                var lineDiscount = decimal.Round(discountPerUnit * item.Quantity, 2);
                return new OrderItem
                {
                    ProductVariantId = variant.ProductVariantId,
                    ProductName = variant.Product.Name,
                    Sku = variant.Sku,
                    VariantDetails = FormatVariant(variant),
                    Quantity = item.Quantity,
                    UnitPrice = variant.RegularPrice,
                    DiscountAmount = lineDiscount,
                    LineTotal = decimal.Round((variant.RegularPrice * item.Quantity) - lineDiscount, 2)
                };
            }).ToArray();

            var subtotal = decimal.Round(orderItems.Sum(x => x.UnitPrice * x.Quantity), 2);
            var totalDiscount = decimal.Round(orderItems.Sum(x => x.DiscountAmount), 2);
            var total = decimal.Round(subtotal - totalDiscount, 2);
            var order = new Order
            {
                OrderNumber = orderNumber,
                CustomerId = customerId,
                GuestEmail = customerId is null ? request.GuestEmail!.Trim() : null,
                Status = OrderStatuses.Pending,
                SubtotalAmount = subtotal,
                DiscountAmount = totalDiscount,
                ShippingAmount = 0m,
                TaxAmount = 0m,
                TotalAmount = total,
                ShippingName = shipping.Name,
                ShippingLine1 = shipping.Line1,
                ShippingCity = shipping.City,
                ShippingRegion = shipping.Region,
                ShippingPostalCode = shipping.PostalCode,
                ShippingCountry = shipping.Country,
                PlacedAt = now,
                Items = orderItems
            };
            db.Orders.Add(order);
            await db.SaveChangesAsync(cancellationToken);

            foreach (var item in items.OrderBy(x => x.ProductVariantId))
            {
                var snapshot = lockedInventory[item.ProductVariantId];
                var inventory = db.Inventory.Local.SingleOrDefault(x => x.InventoryId == snapshot.InventoryId);
                if (inventory is null)
                {
                    inventory = snapshot;
                    db.Inventory.Attach(inventory);
                }
                inventory.QuantityOnHand = snapshot.QuantityOnHand - item.Quantity;
                inventory.UpdatedAt = now;
                db.InventoryTransactions.Add(new InventoryTransaction
                {
                    InventoryId = inventory.InventoryId,
                    TransactionType = InventoryTransactionTypes.Sale,
                    QuantityChange = -item.Quantity,
                    QuantityAfter = inventory.QuantityOnHand,
                    ReferenceType = "Order",
                    ReferenceId = order.OrderId,
                    Notes = "Stock deducted at checkout."
                });
            }

            var paymentResult = total > 0
                ? await paymentProvider.InitiateAsync(
                    new PaymentInitiationRequest(order.OrderNumber, total),
                    cancellationToken)
                : null;
            if (paymentResult is not null)
            {
                order.Payments.Add(new Payment
                {
                    Amount = total,
                    Method = paymentResult.Method,
                    Provider = paymentResult.Provider,
                    ProviderReference = paymentResult.ProviderReference,
                    Status = paymentResult.Status,
                    CreatedAt = now
                });
            }

            db.CartItems.RemoveRange(items);
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            await SendConfirmationEmailAsync(order, cancellationToken);
            return new CheckoutResultDto(
                ToOrderDto(order),
                paymentResult?.Status ?? "NotRequired",
                paymentResult?.Message ?? "Order total is zero; no payment is required.");
        }
        catch (DbUpdateException exception) when (IsUniqueOrderNumberConflict(exception))
        {
            await transaction.RollbackAsync(cancellationToken);
            db.ChangeTracker.Clear();
            var existing = await LoadOrderByFingerprintAsync(fingerprint, cancellationToken);
            if (existing is not null)
                return EnsureOwnerAndMap(existing, customerId, request.GuestEmail);
            throw;
        }
    }

    private async Task SendConfirmationEmailAsync(Order order, CancellationToken cancellationToken)
    {
        try
        {
            var recipient = order.GuestEmail
                ?? (order.CustomerId.HasValue
                    ? await db.Customers.AsNoTracking()
                        .Where(x => x.CustomerId == order.CustomerId.Value)
                        .Select(x => x.Email)
                        .SingleOrDefaultAsync(cancellationToken)
                    : null);
            if (string.IsNullOrWhiteSpace(recipient))
            {
                logger.LogWarning("Order {OrderNumber} has no recipient email; confirmation was not sent.", order.OrderNumber);
                return;
            }

            var (subject, html, text) = OrderConfirmationEmail.Build(order);
            await emails.SendAsync(
                new EmailMessage(recipient.Trim(), order.ShippingName, subject, html, text),
                cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Failed to send the order confirmation email for {OrderNumber}.", order.OrderNumber);
        }
    }

    private async Task<List<CartItem>> LoadCartItemsAsync(int cartId, CancellationToken cancellationToken) =>
        await db.CartItems
            .Where(x => x.CartId == cartId)
            .Include(x => x.ProductVariant).ThenInclude(x => x.Product)
            .Include(x => x.ProductVariant).ThenInclude(x => x.Inventory)
            .Include(x => x.ProductVariant).ThenInclude(x => x.Color)
            .Include(x => x.ProductVariant).ThenInclude(x => x.Size)
            .OrderBy(x => x.ProductVariantId)
            .ToListAsync(cancellationToken);

    private Task<Cart?> FindCartAsync(int? customerId, Guid? guestToken, CancellationToken cancellationToken)
    {
        if (customerId.HasValue)
            return db.Carts.SingleOrDefaultAsync(x => x.CustomerId == customerId.Value, cancellationToken);
        if (guestToken.HasValue)
            return db.Carts.SingleOrDefaultAsync(x => x.GuestToken == guestToken.Value, cancellationToken);
        throw new ServiceException(400, "cart_owner_required", "An authenticated customer or guest cart token is required.");
    }

    private async Task<ShippingSnapshot> ResolveShippingAsync(
        int? customerId,
        CheckoutRequest request,
        CancellationToken cancellationToken)
    {
        if (customerId.HasValue)
        {
            if (!request.ShippingAddressId.HasValue)
                return ShippingSnapshot.Invalid("A shipping address is required.");
            var address = await db.CustomerAddresses.AsNoTracking().SingleOrDefaultAsync(x =>
                x.CustomerAddressId == request.ShippingAddressId &&
                x.CustomerId == customerId.Value &&
                !x.IsDeleted,
                cancellationToken);
            return address is null
                ? ShippingSnapshot.Invalid("The selected shipping address was not found.")
                : new ShippingSnapshot(
                    address.FullName,
                    address.Line1,
                    address.City,
                    address.Region,
                    address.PostalCode,
                    address.Country,
                    []);
        }

        var guest = request.GuestShippingAddress;
        if (guest is null)
            return ShippingSnapshot.Invalid("Guest checkout requires a shipping address.");
        return new ShippingSnapshot(
            guest.FullName.Trim(),
            guest.Line1.Trim(),
            guest.City.Trim(),
            Normalize(guest.Region),
            Normalize(guest.PostalCode),
            guest.Country.Trim(),
            []);
    }

    private static (string Number, string Fingerprint) CreateOrderNumber(int? customerId, Guid? guestToken, Guid key)
    {
        var owner = customerId.HasValue
            ? $"customer:{customerId.Value}"
            : $"guest:{guestToken.GetValueOrDefault():N}";
        var input = Encoding.UTF8.GetBytes($"{owner}|{key:N}");
        var hash = Convert.ToHexString(SHA256.HashData(input));
        var fingerprint = hash[..8];
        var number = $"TCS{DateTime.UtcNow:yyMMddHHmmss}-{fingerprint}";
        return (number, fingerprint);
    }

    private async Task<Order?> LoadOrderByFingerprintAsync(string fingerprint, CancellationToken cancellationToken) =>
        await db.Orders.AsNoTracking()
            .Include(x => x.Items)
            .Include(x => x.Payments)
            .Include(x => x.Shipments)
            .AsSplitQuery()
            .OrderByDescending(x => x.PlacedAt)
            .FirstOrDefaultAsync(x => x.OrderNumber.EndsWith("-" + fingerprint), cancellationToken);

    private static CheckoutResultDto EnsureOwnerAndMap(Order order, int? customerId, string? guestEmail)
    {
        var isOwner = customerId.HasValue
            ? order.CustomerId == customerId.Value
            : order.CustomerId is null && string.Equals(order.GuestEmail, guestEmail?.Trim(), StringComparison.OrdinalIgnoreCase);
        if (!isOwner)
            throw new ServiceException(409, "idempotency_key_reused", "The idempotency key is already associated with another order.");
        return new CheckoutResultDto(
            ToOrderDto(order),
            order.Payments.OrderByDescending(x => x.CreatedAt).FirstOrDefault()?.Status ?? PaymentStatuses.Pending,
            "This idempotent checkout request was already processed.",
            WasAlreadyProcessed: true);
    }

    private static OrderDto ToOrderDto(Order order) =>
        new(
            order.OrderId,
            order.OrderNumber,
            order.Status,
            order.SubtotalAmount,
            order.DiscountAmount,
            order.ShippingAmount,
            order.TaxAmount,
            order.TotalAmount,
            order.PlacedAt,
            order.GuestEmail,
            order.ShippingName,
            order.ShippingLine1,
            order.ShippingCity,
            order.ShippingRegion,
            order.ShippingPostalCode,
            order.ShippingCountry,
            order.Items.Select(x => new OrderItemDto(
                x.ProductName, x.Sku, x.VariantDetails, x.Quantity, x.UnitPrice, x.DiscountAmount, x.LineTotal, x.ProductVariantId)).ToArray(),
            order.Payments.Select(x => new PaymentDto(
                x.PaymentId, x.OrderId, x.Amount, x.Method, x.Provider, x.ProviderReference, x.Status, x.CreatedAt, x.ProcessedAt)).ToArray(),
            order.Shipments.Select(x => new ShipmentDto(
                x.ShipmentId, x.OrderId, x.Carrier, x.TrackingNumber, x.Status, x.ShippedAt, x.DeliveredAt)).ToArray());

    private static bool IsPurchasable(ProductVariant variant) =>
        variant.IsActive && !variant.IsDeleted &&
        variant.Product.Status == "Active" && !variant.Product.IsDeleted;

    private static string? FormatVariant(ProductVariant variant)
    {
        var values = new List<string>();
        if (!string.IsNullOrWhiteSpace(variant.Color?.Name))
            values.Add(variant.Color.Name);
        if (!string.IsNullOrWhiteSpace(variant.Size?.Name))
            values.Add(variant.Size.Name);
        if (variant.VolumeMl.HasValue)
            values.Add($"{variant.VolumeMl.Value} ml");
        return values.Count == 0 ? null : string.Join(" / ", values);
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static bool IsUniqueOrderNumberConflict(DbUpdateException exception) =>
        exception.InnerException is SqlException { Number: 2601 or 2627 };

    private IPaymentProvider? FindProvider(string method) =>
        paymentProviders.FirstOrDefault(x => string.Equals(x.Method, method, StringComparison.OrdinalIgnoreCase));

    private sealed record ShippingSnapshot(
        string? Name,
        string? Line1,
        string? City,
        string? Region,
        string? PostalCode,
        string? Country,
        IReadOnlyList<string> Errors)
    {
        public static ShippingSnapshot Invalid(string message) =>
            new(null, null, null, null, null, null, [message]);
    }
}

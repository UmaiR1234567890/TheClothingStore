using System.Data;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using ClothingStore.Application.Services;
using ClothingStore.Domain.Constants;
using ClothingStore.Domain.Entities;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.Infrastructure.Services;

internal sealed class OrderService(ClothingStoreDbContext db) : IOrderService
{
    public async Task<PagedResult<OrderDto>> GetCustomerOrdersAsync(
        int customerId,
        int page,
        int size,
        string? status,
        CancellationToken cancellationToken)
    {
        ValidatePage(page, size);
        var query = db.Orders.AsNoTracking().Where(x => x.CustomerId == customerId);
        if (!string.IsNullOrWhiteSpace(status))
        {
            ValidateOrderStatus(status);
            query = query.Where(x => x.Status == status);
        }
        var count = await query.CountAsync(cancellationToken);
        var rows = await LoadOrderGraph(query.OrderByDescending(x => x.PlacedAt))
            .Skip((page - 1) * size).Take(size)
            .ToListAsync(cancellationToken);
        return new PagedResult<OrderDto>(rows.Select(ToDto).ToArray(), page, size, count);
    }

    public async Task<OrderDto> GetCustomerOrderAsync(int customerId, int orderId, CancellationToken cancellationToken)
    {
        var order = await LoadOrderGraph(db.Orders.AsNoTracking()
                .Where(x => x.OrderId == orderId && x.CustomerId == customerId))
            .SingleOrDefaultAsync(cancellationToken);
        return order is null
            ? throw new ServiceException(404, "order_not_found", "Order was not found.")
            : ToDto(order);
    }

    public async Task<OrderDto> GetOrderTrackingAsync(int customerId, int orderId, CancellationToken cancellationToken)
    {
        var order = await db.Orders.AsNoTracking()
            .Where(x => x.OrderId == orderId && x.CustomerId == customerId)
            .Include(x => x.Items)
            .Include(x => x.Payments)
            .Include(x => x.Shipments)
            .SingleOrDefaultAsync(cancellationToken);
        return order is null
            ? throw new ServiceException(404, "order_not_found", "Order was not found.")
            : ToDto(order);
    }

    public async Task<OrderDto> GetGuestOrderTrackingAsync(
        string orderNumber,
        string email,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(orderNumber) || string.IsNullOrWhiteSpace(email))
            throw new ServiceException(400, "tracking_details_required", "An order number and the checkout email are required.");
        var order = await LoadOrderGraph(db.Orders.AsNoTracking()
                .Where(x => x.OrderNumber == orderNumber.Trim() &&
                            x.CustomerId == null &&
                            x.GuestEmail != null &&
                            x.GuestEmail == email.Trim()))
            .SingleOrDefaultAsync(cancellationToken);
        return order is null
            ? throw new ServiceException(404, "order_not_found", "No order matches that number and email.")
            : ToDto(order);
    }

    public async Task<PagedResult<OrderDto>> GetAdminOrdersAsync(
        int page,
        int size,
        string? status,
        string? search,
        CancellationToken cancellationToken)
    {
        ValidatePage(page, size);
        var query = db.Orders.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status))
        {
            ValidateOrderStatus(status);
            query = query.Where(x => x.Status == status);
        }
        var term = search?.Trim();
        if (!string.IsNullOrWhiteSpace(term))
        {
            var isNumeric = int.TryParse(term, out var numericId);
            query = query.Where(x =>
                x.OrderNumber.Contains(term) ||
                (isNumeric && x.OrderId == numericId) ||
                (x.GuestEmail != null && x.GuestEmail.Contains(term)) ||
                (x.Customer != null && x.Customer.Email.Contains(term)));
        }
        var count = await query.CountAsync(cancellationToken);
        var rows = await LoadOrderGraph(query.OrderByDescending(x => x.PlacedAt))
            .Skip((page - 1) * size).Take(size)
            .ToListAsync(cancellationToken);
        return new PagedResult<OrderDto>(rows.Select(ToDto).ToArray(), page, size, count);
    }

    public async Task<OrderDto> GetAdminOrderAsync(int orderId, CancellationToken cancellationToken)
    {
        var order = await LoadOrderGraph(db.Orders.AsNoTracking().Where(x => x.OrderId == orderId))
            .SingleOrDefaultAsync(cancellationToken);
        return order is null
            ? throw new ServiceException(404, "order_not_found", "Order was not found.")
            : ToDto(order);
    }

    public async Task<OrderDto> UpdateStatusAsync(
        int orderId,
        string status,
        string actorId,
        CancellationToken cancellationToken)
    {
        ValidateOrderStatus(status);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var order = await db.Orders
            .Include(x => x.Items)
            .Include(x => x.Payments)
            .Include(x => x.Shipments)
            .SingleOrDefaultAsync(x => x.OrderId == orderId, cancellationToken);
        if (order is null)
            throw new ServiceException(404, "order_not_found", "Order was not found.");
        if (order.Status == status)
            return ToDto(order);

        if (!OrderTransitionPolicy.IsAllowed(
                order.Status,
                status,
                order.Payments.Any(x => x.Status == PaymentStatuses.Captured),
                order.Payments.Any(x => x.Status == PaymentStatuses.Refunded),
                order.Shipments.Any(x => x.Status is ShipmentStatuses.Shipped or ShipmentStatuses.InTransit or ShipmentStatuses.OutForDelivery or ShipmentStatuses.Delivered),
                order.Shipments.Any(x => x.Status == ShipmentStatuses.Delivered)))
        {
            if (status == OrderStatuses.Paid && !order.Payments.Any(x => x.Status == PaymentStatuses.Captured))
                throw new ServiceException(409, "payment_not_captured", "An order cannot be marked paid without a captured payment.");
            if (status == OrderStatuses.Shipped &&
                !order.Shipments.Any(x => x.Status is ShipmentStatuses.Shipped or ShipmentStatuses.Delivered))
                throw new ServiceException(409, "shipment_not_ready", "A shipment must be marked shipped before the order can be shipped.");
            if (status == OrderStatuses.Completed)
                throw new ServiceException(409, "order_not_complete", "Completion requires delivery and a captured payment.");
            if (status == OrderStatuses.Cancelled &&
                order.Payments.Any(x => x.Status is PaymentStatuses.Captured or PaymentStatuses.Refunded))
                throw new ServiceException(409, "payment_refund_required", "Orders with captured payments cannot be cancelled without a verified refund workflow.");
            if (status == OrderStatuses.Refunded &&
                !order.Payments.Any(x => x.Status == PaymentStatuses.Refunded))
                throw new ServiceException(409, "refund_required", "Record a payment refund before marking the order refunded.");
            throw new ServiceException(409, "invalid_order_transition", $"Order status cannot move from {order.Status} to {status}.");
        }
        if (status is OrderStatuses.Cancelled or OrderStatuses.Returned or OrderStatuses.Refunded)
            await RestockAsync(order, cancellationToken);

        var oldStatus = order.Status;
        order.Status = status;
        db.AuditLogs.Add(new AuditLog
        {
            EntityName = "Orders",
            EntityId = order.OrderId.ToString(),
            Action = "Update",
            IdentityUserId = actorId,
            ChangeSummary = $"Order status changed from {oldStatus} to {status}."
        });
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ToDto(order);
    }

    private async Task RestockAsync(Order order, CancellationToken cancellationToken)
    {
        var alreadyRestocked = await db.InventoryTransactions.AsNoTracking()
            .AnyAsync(x => x.ReferenceId == order.OrderId
                && (x.ReferenceType == "OrderCancellation" || x.ReferenceType == "PaymentRefund"),
                cancellationToken);
        if (alreadyRestocked)
            return;
        foreach (var line in order.Items.Where(x => x.ProductVariantId.HasValue).OrderBy(x => x.ProductVariantId))
        {
            var variantId = line.ProductVariantId!.Value;
            var snapshot = await db.Inventory
                .FromSqlInterpolated(
                    $"SELECT * FROM dbo.Inventory WITH (UPDLOCK, ROWLOCK) WHERE ProductVariantId = {variantId}")
                .AsNoTracking()
                .SingleOrDefaultAsync(cancellationToken);
            if (snapshot is null)
                throw new ServiceException(409, "inventory_missing", $"Inventory is missing for variant {variantId}; cancellation was not applied.");

            var inventory = db.Inventory.Local.SingleOrDefault(x => x.InventoryId == snapshot.InventoryId);
            if (inventory is null)
            {
                inventory = snapshot;
                db.Inventory.Attach(inventory);
            }
            inventory.QuantityOnHand = checked(snapshot.QuantityOnHand + line.Quantity);
            inventory.UpdatedAt = DateTime.UtcNow;
            db.InventoryTransactions.Add(new InventoryTransaction
            {
                InventoryId = inventory.InventoryId,
                TransactionType = InventoryTransactionTypes.Adjustment,
                QuantityChange = line.Quantity,
                QuantityAfter = inventory.QuantityOnHand,
                ReferenceType = "OrderCancellation",
                ReferenceId = order.OrderId,
                Notes = "Stock restored after order cancellation, return, or refund."
            });
        }
    }

    private static IQueryable<Order> LoadOrderGraph(IQueryable<Order> query) =>
        query.Include(x => x.Items)
            .Include(x => x.Payments)
            .Include(x => x.Shipments)
            .AsSplitQuery();

    private static OrderDto ToDto(Order order) =>
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
                x.PaymentId, x.OrderId, x.Amount, x.Method, x.Provider, x.ProviderReference, x.Status, x.CreatedAt, x.ProcessedAt, order.OrderNumber)).ToArray(),
            order.Shipments.Select(x => new ShipmentDto(
                x.ShipmentId, x.OrderId, x.Carrier, x.TrackingNumber, x.Status, x.CreatedAt, x.PackedAt, x.ShippedAt, x.DeliveredAt, order.OrderNumber)).ToArray());

    private static void ValidateOrderStatus(string status)
    {
        if (status is not (OrderStatuses.Pending or OrderStatuses.Paid or OrderStatuses.Processing or
            OrderStatuses.Shipped or OrderStatuses.Completed or OrderStatuses.Returned or
            OrderStatuses.Refunded or OrderStatuses.Cancelled))
            throw new ServiceException(400, "invalid_order_status", "The order status is invalid.");
    }

    private static void ValidatePage(int page, int size)
    {
        if (page < 1 || size is < 1 or > 100)
            throw new ServiceException(400, "invalid_pagination", "Page number must be positive and page size must be between 1 and 100.");
    }
}

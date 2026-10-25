using System.Data;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using ClothingStore.Domain.Constants;
using ClothingStore.Domain.Entities;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.Infrastructure.Services;

internal sealed class PaymentService(
    ClothingStoreDbContext db,
    IEnumerable<IPaymentProvider> paymentProviders) : IPaymentService
{
    public async Task<PaymentDto?> GetCustomerPaymentAsync(
        int customerId,
        int orderId,
        CancellationToken cancellationToken)
    {
        var ownsOrder = await db.Orders.AsNoTracking()
            .AnyAsync(x => x.OrderId == orderId && x.CustomerId == customerId, cancellationToken);
        if (!ownsOrder)
            throw new ServiceException(404, "order_not_found", "Order was not found.");
        var payment = await db.Payments.AsNoTracking()
            .Include(x => x.Order)
            .Where(x => x.OrderId == orderId)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        return payment is null ? null : ToDto(payment);
    }

    public async Task<PaymentDto> InitiateCustomerPaymentAsync(
        int customerId,
        int orderId,
        string method,
        CancellationToken cancellationToken)
    {
        var provider = paymentProviders.FirstOrDefault(x =>
            string.Equals(x.Method, method, StringComparison.OrdinalIgnoreCase));
        if (provider is null)
            throw new ServiceException(503, "payment_provider_unavailable", "The requested payment provider is not configured.");
        var order = await db.Orders.SingleOrDefaultAsync(
            x => x.OrderId == orderId && x.CustomerId == customerId,
            cancellationToken);
        if (order is null)
            throw new ServiceException(404, "order_not_found", "Order was not found.");
        if (order.Status == OrderStatuses.Cancelled)
            throw new ServiceException(409, "order_cancelled", "A cancelled order cannot initiate payment.");
        if (order.TotalAmount <= 0)
            throw new ServiceException(409, "payment_not_required", "A zero-total order does not require a payment record.");

        var existing = await db.Payments
            .Where(x => x.OrderId == orderId)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (existing is not null)
        {
            if (existing.Method != "COD")
                throw new ServiceException(409, "payment_method_conflict", "A different payment method has already been recorded.");
            return ToDto(existing);
        }

        var initiation = await provider.InitiateAsync(
            new PaymentInitiationRequest(order.OrderNumber, order.TotalAmount),
            cancellationToken);
        var payment = new Payment
        {
            OrderId = orderId,
            Amount = order.TotalAmount,
            Method = initiation.Method,
            Provider = initiation.Provider,
            ProviderReference = initiation.ProviderReference,
            Status = initiation.Status
        };
        db.Payments.Add(payment);
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(payment);
    }

    public async Task<PagedResult<PaymentDto>> GetAdminPaymentsAsync(int page, int size, string? search, CancellationToken cancellationToken)
    {
        ValidatePage(page, size);
        var query = db.Payments.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            var isNumericId = int.TryParse(term, out var numericId);
            query = query.Where(x =>
                x.Order.OrderNumber.Contains(term) ||
                (isNumericId && (x.OrderId == numericId || x.PaymentId == numericId)) ||
                (x.ProviderReference != null && x.ProviderReference.Contains(term)));
        }
        var count = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Select(x => new PaymentDto(
                x.PaymentId, x.OrderId, x.Amount, x.Method, x.Provider, x.ProviderReference, x.Status, x.CreatedAt, x.ProcessedAt, x.Order.OrderNumber))
            .ToListAsync(cancellationToken);
        return new PagedResult<PaymentDto>(items, page, size, count);
    }

    public async Task<PaymentDto> GetAdminPaymentAsync(int paymentId, CancellationToken cancellationToken)
    {
        var payment = await db.Payments.AsNoTracking()
            .Include(x => x.Order)
            .SingleOrDefaultAsync(x => x.PaymentId == paymentId, cancellationToken);
        return payment is null
            ? throw new ServiceException(404, "payment_not_found", "Payment was not found.")
            : ToDto(payment);
    }

    public async Task<PaymentDto> MarkCashCollectedAsync(
        int paymentId,
        string actorId,
        string reason,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length < 3)
            throw new ServiceException(400, "reason_required", "A reason is required to record cash collection.");
        var payment = await db.Payments
            .Include(x => x.Order)
                .ThenInclude(x => x.Shipments)
            .SingleOrDefaultAsync(x => x.PaymentId == paymentId, cancellationToken);
        if (payment is null)
            throw new ServiceException(404, "payment_not_found", "Payment was not found.");
        if (payment.Method != "COD" || payment.Status != PaymentStatuses.Pending)
            throw new ServiceException(409, "payment_not_collectible", "Only pending cash-on-delivery payments can be collected.");
        if (payment.Order.Status == OrderStatuses.Cancelled)
            throw new ServiceException(409, "order_cancelled", "A cancelled order cannot be collected.");

        payment.Status = PaymentStatuses.Captured;
        payment.ProcessedAt = DateTime.UtcNow;
        payment.ProviderReference = $"COD-{payment.PaymentId}";
        // Move the order forward automatically now that money is captured.
        if (payment.Order.Status == OrderStatuses.Pending)
            payment.Order.Status = OrderStatuses.Paid;
        if (payment.Order.Shipments.Any(x => x.Status == ShipmentStatuses.Delivered)
            && payment.Order.Status is OrderStatuses.Paid or OrderStatuses.Processing or OrderStatuses.Shipped)
        {
            payment.Order.Status = OrderStatuses.Completed;
        }
        db.AuditLogs.Add(new AuditLog
        {
            EntityName = "Payments",
            EntityId = payment.PaymentId.ToString(),
            Action = "Update",
            IdentityUserId = actorId,
            ChangeSummary = $"Cash-on-delivery marked collected. Reason: {reason.Trim()}"
        });
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(payment);
    }

    public async Task<PaymentDto> RefundPaymentAsync(
        int paymentId,
        string actorId,
        string reason,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length < 3)
            throw new ServiceException(400, "reason_required", "A reason is required to record a refund.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var payment = await db.Payments
            .Include(x => x.Order)
                .ThenInclude(x => x.Items)
            .SingleOrDefaultAsync(x => x.PaymentId == paymentId, cancellationToken);
        if (payment is null)
            throw new ServiceException(404, "payment_not_found", "Payment was not found.");
        if (payment.Status == PaymentStatuses.Refunded)
            return ToDto(payment);
        if (payment.Status != PaymentStatuses.Captured)
            throw new ServiceException(409, "payment_not_refundable", "Only captured payments can be refunded.");
        var order = payment.Order;
        if (order.Status == OrderStatuses.Cancelled)
            throw new ServiceException(409, "order_cancelled", "A cancelled order cannot be refunded.");

        payment.Status = PaymentStatuses.Refunded;
        payment.ProcessedAt = DateTime.UtcNow;
        var oldStatus = order.Status;
        order.Status = OrderStatuses.Refunded;
        await RestockAsync(order, cancellationToken);
        db.AuditLogs.Add(new AuditLog
        {
            EntityName = "Payments",
            EntityId = payment.PaymentId.ToString(),
            Action = "Update",
            IdentityUserId = actorId,
            ChangeSummary = $"Payment refunded ({payment.Amount:0.00}). Reason: {reason.Trim()}"
        });
        db.AuditLogs.Add(new AuditLog
        {
            EntityName = "Orders",
            EntityId = order.OrderId.ToString(),
            Action = "Update",
            IdentityUserId = actorId,
            ChangeSummary = $"Order status changed from {oldStatus} to {OrderStatuses.Refunded} after refund."
        });
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ToDto(payment);
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
                continue;

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
                ReferenceType = "PaymentRefund",
                ReferenceId = order.OrderId,
                Notes = "Stock restored after payment refund."
            });
        }
    }

    private static PaymentDto ToDto(Payment payment) =>
        new(
            payment.PaymentId,
            payment.OrderId,
            payment.Amount,
            payment.Method,
            payment.Provider,
            payment.ProviderReference,
            payment.Status,
            payment.CreatedAt,
            payment.ProcessedAt,
            payment.Order?.OrderNumber);

    private static void ValidatePage(int page, int size)
    {
        if (page < 1 || size is < 1 or > 100)
            throw new ServiceException(400, "invalid_pagination", "Page number must be positive and page size must be between 1 and 100.");
    }
}

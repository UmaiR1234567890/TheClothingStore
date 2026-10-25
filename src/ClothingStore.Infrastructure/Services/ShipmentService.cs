using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using ClothingStore.Domain.Constants;
using ClothingStore.Domain.Entities;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.Infrastructure.Services;

internal sealed class ShipmentService(ClothingStoreDbContext db, AuditLogWriter audit) : IShipmentService
{
    public async Task<PagedResult<ShipmentDto>> GetAdminShipmentsAsync(
        int page,
        int size,
        CancellationToken cancellationToken)
    {
        ValidatePage(page, size);
        var query = db.Shipments.AsNoTracking();
        var count = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Select(ToDtoExpression())
            .ToListAsync(cancellationToken);
        return new PagedResult<ShipmentDto>(items, page, size, count);
    }

    public async Task<IReadOnlyList<CarrierDto>> GetCarriersAsync(CancellationToken cancellationToken) =>
        await db.Carriers.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Name)
            .Select(x => new CarrierDto(x.CarrierId, x.Name, x.Code))
            .ToListAsync(cancellationToken);

    public async Task<ShipmentDto> CreateShipmentAsync(ShipmentWriteRequest request, CancellationToken cancellationToken)
    {
        if (request.Status != ShipmentStatuses.Pending)
            throw new ServiceException(400, "invalid_initial_shipment_status", "A shipment must start in Pending status.");
        var orderNumber = await db.Orders.AsNoTracking()
            .Where(x => x.OrderId == request.OrderId && x.Status != OrderStatuses.Cancelled)
            .Select(x => x.OrderNumber)
            .SingleOrDefaultAsync(cancellationToken);
        if (orderNumber is null)
            throw new ServiceException(404, "order_not_found", "An active order was not found.");

        var shipment = new Shipment
        {
            OrderId = request.OrderId,
            Carrier = Normalize(request.Carrier),
            TrackingNumber = Normalize(request.TrackingNumber),
            Status = ShipmentStatuses.Pending
        };
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        db.Shipments.Add(shipment);
        await db.SaveChangesAsync(cancellationToken);
        audit.Record("Shipments", shipment.ShipmentId.ToString(), "Insert", $"Created shipment for order {request.OrderId}.");
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ToDto(shipment, orderNumber);
    }

    public async Task<ShipmentDto> UpdateShipmentAsync(
        int id,
        ShipmentWriteRequest request,
        CancellationToken cancellationToken)
    {
        var shipment = await db.Shipments
            .Include(x => x.Order).ThenInclude(x => x.Payments)
            .SingleOrDefaultAsync(x => x.ShipmentId == id, cancellationToken);
        if (shipment is null)
            throw new ServiceException(404, "shipment_not_found", "Shipment was not found.");
        if (shipment.OrderId != request.OrderId)
            throw new ServiceException(400, "shipment_order_immutable", "A shipment cannot be reassigned to another order.");
        if (request.Status != shipment.Status)
        {
            EnsureTransition(shipment.Status, request.Status);
            SetStatus(shipment, request.Status);
            SyncOrderStatus(shipment.Order, request.Status);
        }
        shipment.Carrier = Normalize(request.Carrier);
        shipment.TrackingNumber = Normalize(request.TrackingNumber);
        audit.Record("Shipments", id.ToString(), "Update", "Updated shipment information.");
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(shipment);
    }

    public async Task<ShipmentDto> UpdateShipmentStatusAsync(
        int id,
        string status,
        CancellationToken cancellationToken)
    {
        var shipment = await db.Shipments
            .Include(x => x.Order).ThenInclude(x => x.Payments)
            .SingleOrDefaultAsync(x => x.ShipmentId == id, cancellationToken);
        if (shipment is null)
            throw new ServiceException(404, "shipment_not_found", "Shipment was not found.");
        EnsureTransition(shipment.Status, status);
        SetStatus(shipment, status);
        SyncOrderStatus(shipment.Order, status);
        audit.Record("Shipments", id.ToString(), "Update", $"Changed shipment status to {status}.");
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(shipment);
    }

    private static void SyncOrderStatus(Order order, string shipmentStatus)
    {
        // Keep the order in step with fulfillment automatically:
        //   packed/shipped -> Processing or Shipped, delivered + paid -> Completed.
        var moving = shipmentStatus is ShipmentStatuses.Packed or ShipmentStatuses.Shipped
            or ShipmentStatuses.InTransit or ShipmentStatuses.OutForDelivery;
        if (moving && order.Status is OrderStatuses.Pending or OrderStatuses.Paid)
        {
            order.Status = OrderStatuses.Processing;
        }
        if (shipmentStatus == ShipmentStatuses.Shipped && order.Status == OrderStatuses.Processing)
            order.Status = OrderStatuses.Shipped;
        var paid = order.Payments.Any(x => x.Status == PaymentStatuses.Captured);
        if (shipmentStatus == ShipmentStatuses.Delivered && paid
            && order.Status is OrderStatuses.Paid or OrderStatuses.Processing or OrderStatuses.Shipped)
        {
            order.Status = OrderStatuses.Completed;
        }
    }

    private static void EnsureTransition(string current, string next)
    {
        var allowed = current switch
        {
            ShipmentStatuses.Pending => next == ShipmentStatuses.Packed,
            ShipmentStatuses.Packed => next == ShipmentStatuses.Shipped,
            ShipmentStatuses.Shipped => next is ShipmentStatuses.Delivered or ShipmentStatuses.Returned,
            ShipmentStatuses.InTransit => next is ShipmentStatuses.OutForDelivery or ShipmentStatuses.Delivered or ShipmentStatuses.Returned,
            ShipmentStatuses.OutForDelivery => next is ShipmentStatuses.Delivered or ShipmentStatuses.Returned,
            ShipmentStatuses.Delivered => next == ShipmentStatuses.Returned,
            _ => false
        };
        if (!allowed)
            throw new ServiceException(409, "invalid_shipment_transition", $"Shipment status cannot move from {current} to {next}.");
    }

    private static void SetStatus(Shipment shipment, string status)
    {
        shipment.Status = status;
        if (status == ShipmentStatuses.Shipped)
            shipment.ShippedAt = DateTime.UtcNow;
        if (status == ShipmentStatuses.Delivered)
            shipment.DeliveredAt = DateTime.UtcNow;
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static ShipmentDto ToDto(Shipment shipment, string? orderNumber = null) =>
        new(shipment.ShipmentId, shipment.OrderId, shipment.Carrier, shipment.TrackingNumber, shipment.Status, shipment.ShippedAt, shipment.DeliveredAt, orderNumber ?? shipment.Order?.OrderNumber);

    private static System.Linq.Expressions.Expression<Func<Shipment, ShipmentDto>> ToDtoExpression() =>
        x => new ShipmentDto(x.ShipmentId, x.OrderId, x.Carrier, x.TrackingNumber, x.Status, x.ShippedAt, x.DeliveredAt, x.Order.OrderNumber);

    private static void ValidatePage(int page, int size)
    {
        if (page < 1 || size is < 1 or > 100)
            throw new ServiceException(400, "invalid_pagination", "Page number must be positive and page size must be between 1 and 100.");
    }
}

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

    public async Task<ShipmentDto> CreateShipmentAsync(ShipmentWriteRequest request, CancellationToken cancellationToken)
    {
        if (request.Status != ShipmentStatuses.Pending)
            throw new ServiceException(400, "invalid_initial_shipment_status", "A shipment must start in Pending status.");
        var orderExists = await db.Orders.AnyAsync(x =>
            x.OrderId == request.OrderId && x.Status != OrderStatuses.Cancelled,
            cancellationToken);
        if (!orderExists)
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
        return ToDto(shipment);
    }

    public async Task<ShipmentDto> UpdateShipmentAsync(
        int id,
        ShipmentWriteRequest request,
        CancellationToken cancellationToken)
    {
        var shipment = await db.Shipments.SingleOrDefaultAsync(x => x.ShipmentId == id, cancellationToken);
        if (shipment is null)
            throw new ServiceException(404, "shipment_not_found", "Shipment was not found.");
        if (shipment.OrderId != request.OrderId)
            throw new ServiceException(400, "shipment_order_immutable", "A shipment cannot be reassigned to another order.");
        if (request.Status != shipment.Status)
            EnsureTransition(shipment.Status, request.Status);
        shipment.Carrier = Normalize(request.Carrier);
        shipment.TrackingNumber = Normalize(request.TrackingNumber);
        if (request.Status != shipment.Status)
            SetStatus(shipment, request.Status);
        audit.Record("Shipments", id.ToString(), "Update", "Updated shipment information.");
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(shipment);
    }

    public async Task<ShipmentDto> UpdateShipmentStatusAsync(
        int id,
        string status,
        CancellationToken cancellationToken)
    {
        var shipment = await db.Shipments.SingleOrDefaultAsync(x => x.ShipmentId == id, cancellationToken);
        if (shipment is null)
            throw new ServiceException(404, "shipment_not_found", "Shipment was not found.");
        EnsureTransition(shipment.Status, status);
        SetStatus(shipment, status);
        audit.Record("Shipments", id.ToString(), "Update", $"Changed shipment status to {status}.");
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(shipment);
    }

    private static void EnsureTransition(string current, string next)
    {
        var allowed = current switch
        {
            ShipmentStatuses.Pending => next == ShipmentStatuses.Packed,
            ShipmentStatuses.Packed => next == ShipmentStatuses.Shipped,
            ShipmentStatuses.Shipped => next is ShipmentStatuses.Delivered or ShipmentStatuses.Returned,
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

    private static ShipmentDto ToDto(Shipment shipment) =>
        new(shipment.ShipmentId, shipment.OrderId, shipment.Carrier, shipment.TrackingNumber, shipment.Status, shipment.ShippedAt, shipment.DeliveredAt);

    private static System.Linq.Expressions.Expression<Func<Shipment, ShipmentDto>> ToDtoExpression() =>
        x => new ShipmentDto(x.ShipmentId, x.OrderId, x.Carrier, x.TrackingNumber, x.Status, x.ShippedAt, x.DeliveredAt);

    private static void ValidatePage(int page, int size)
    {
        if (page < 1 || size is < 1 or > 100)
            throw new ServiceException(400, "invalid_pagination", "Page number must be positive and page size must be between 1 and 100.");
    }
}

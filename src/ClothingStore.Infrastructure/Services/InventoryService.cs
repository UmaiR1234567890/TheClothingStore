using System.Data;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using ClothingStore.Application.Services;
using ClothingStore.Domain.Constants;
using ClothingStore.Domain.Entities;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.Infrastructure.Services;

internal sealed class InventoryService(ClothingStoreDbContext db) : IInventoryService
{
    public async Task<PagedResult<InventoryDto>> GetInventoryAsync(
        int page,
        int size,
        string? search,
        CancellationToken cancellationToken)
    {
        ValidatePage(page, size);
        IQueryable<Inventory> query = db.Inventory.AsNoTracking()
            .Include(x => x.ProductVariant).ThenInclude(x => x.Product);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(x => x.ProductVariant.Sku.Contains(term) || x.ProductVariant.Product.Name.Contains(term));
        }
        var count = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(x => x.ProductVariant.Sku)
            .Skip((page - 1) * size).Take(size)
            .Select(x => new InventoryDto(
                x.ProductVariantId,
                x.ProductVariant.Sku,
                x.QuantityOnHand,
                x.QuantityReserved,
                x.QuantityOnHand - x.QuantityReserved,
                x.UpdatedAt))
            .ToListAsync(cancellationToken);
        return new PagedResult<InventoryDto>(items, page, size, count);
    }

    public async Task<InventoryDto> GetVariantInventoryAsync(int variantId, CancellationToken cancellationToken)
    {
        var inventory = await db.Inventory.AsNoTracking()
            .Include(x => x.ProductVariant)
            .SingleOrDefaultAsync(x => x.ProductVariantId == variantId, cancellationToken);
        return inventory is null
            ? throw new ServiceException(404, "inventory_not_found", "Inventory was not found.")
            : ToDto(inventory);
    }

    public async Task<InventoryDto> AdjustAsync(
        InventoryAdjustmentRequest request,
        string actorId,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var snapshot = await db.Inventory
            .FromSqlInterpolated(
                $"SELECT * FROM dbo.Inventory WITH (UPDLOCK, ROWLOCK) WHERE ProductVariantId = {request.ProductVariantId}")
            .AsNoTracking()
            .SingleOrDefaultAsync(cancellationToken);
        if (snapshot is null)
            throw new ServiceException(404, "inventory_not_found", "Inventory was not found for this variant.");

        var newQuantity = InventoryRules.ApplyAdjustment(
            snapshot.QuantityOnHand,
            snapshot.QuantityReserved,
            request.QuantityChange);

        var inventory = db.Inventory.Local.SingleOrDefault(x => x.InventoryId == snapshot.InventoryId);
        if (inventory is null)
        {
            inventory = snapshot;
            db.Inventory.Attach(inventory);
        }
        inventory.QuantityOnHand = newQuantity;
        inventory.UpdatedAt = DateTime.UtcNow;
        db.InventoryTransactions.Add(new InventoryTransaction
        {
            InventoryId = inventory.InventoryId,
            TransactionType = InventoryTransactionTypes.Adjustment,
            QuantityChange = request.QuantityChange,
            QuantityAfter = newQuantity,
            ReferenceType = "AdminAdjustment",
            Notes = request.Reason.Trim()
        });
        db.AuditLogs.Add(new AuditLog
        {
            EntityName = "Inventory",
            EntityId = inventory.InventoryId.ToString(),
            Action = "Update",
            IdentityUserId = actorId,
            ChangeSummary = $"Stock adjustment {request.QuantityChange:+#;-#;0}. Reason: {request.Reason.Trim()}"
        });
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var variant = await db.ProductVariants.AsNoTracking()
            .SingleAsync(x => x.ProductVariantId == request.ProductVariantId, cancellationToken);
        return new InventoryDto(
            request.ProductVariantId,
            variant.Sku,
            newQuantity,
            snapshot.QuantityReserved,
            newQuantity - snapshot.QuantityReserved,
            inventory.UpdatedAt);
    }

    public async Task<PagedResult<InventoryTransactionDto>> GetTransactionsAsync(
        int page,
        int size,
        int? variantId,
        CancellationToken cancellationToken)
    {
        ValidatePage(page, size);
        IQueryable<InventoryTransaction> query = db.InventoryTransactions.AsNoTracking()
            .Include(x => x.Inventory).ThenInclude(x => x.ProductVariant);
        if (variantId.HasValue)
            query = query.Where(x => x.Inventory.ProductVariantId == variantId.Value);
        var count = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.InventoryTransactionId)
            .Skip((page - 1) * size).Take(size)
            .Select(x => new InventoryTransactionDto(
                x.InventoryTransactionId,
                x.Inventory.ProductVariantId,
                x.Inventory.ProductVariant.Sku,
                x.TransactionType,
                x.QuantityChange,
                x.QuantityAfter,
                x.ReferenceType,
                x.ReferenceId,
                x.Notes,
                x.CreatedAt))
            .ToListAsync(cancellationToken);
        return new PagedResult<InventoryTransactionDto>(items, page, size, count);
    }

    private static InventoryDto ToDto(Inventory inventory) =>
        new(
            inventory.ProductVariantId,
            inventory.ProductVariant.Sku,
            inventory.QuantityOnHand,
            inventory.QuantityReserved,
            inventory.QuantityOnHand - inventory.QuantityReserved,
            inventory.UpdatedAt);

    private static void ValidatePage(int page, int size)
    {
        if (page < 1 || size is < 1 or > 100)
            throw new ServiceException(400, "invalid_pagination", "Page number must be positive and page size must be between 1 and 100.");
    }
}

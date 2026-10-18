using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using ClothingStore.Domain.Constants;
using ClothingStore.Domain.Entities;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.Infrastructure.Services;

internal sealed class PricingAdminService(ClothingStoreDbContext db, AuditLogWriter audit) : IPricingAdminService
{
    public async Task<PagedResult<SaleDto>> GetSalesAsync(int page, int size, CancellationToken cancellationToken)
    {
        ValidatePage(page, size);
        var query = db.Sales.AsNoTracking().Where(x => !x.IsDeleted);
        var count = await query.CountAsync(cancellationToken);
        var sales = await query.OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Select(ToDtoExpression())
            .ToListAsync(cancellationToken);
        return new PagedResult<SaleDto>(sales, page, size, count);
    }

    public async Task<SaleDto> CreateSaleAsync(SaleWriteRequest request, CancellationToken cancellationToken)
    {
        ValidateSale(request);
        var productIds = await ValidateProductIdsAsync(request.ProductIds, cancellationToken);
        var sale = new Sale
        {
            Name = request.Name.Trim(),
            DiscountType = request.DiscountType,
            DiscountValue = request.DiscountValue,
            StartsAt = AsUtc(request.StartsAt),
            EndsAt = AsUtc(request.EndsAt),
            IsActive = true,
            IsDeleted = false
        };
        foreach (var productId in productIds)
            sale.SaleProducts.Add(new SaleProduct { Sale = sale, ProductId = productId });
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        db.Sales.Add(sale);
        await SaveWithConflictTranslationAsync(cancellationToken);
        audit.Record("Sales", sale.SaleId.ToString(), "Insert", $"Created promotion '{sale.Name}'.");
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ToDto(sale);
    }

    public async Task<SaleDto> UpdateSaleAsync(int id, SaleWriteRequest request, CancellationToken cancellationToken)
    {
        ValidateSale(request);
        var sale = await db.Sales.Include(x => x.SaleProducts)
            .SingleOrDefaultAsync(x => x.SaleId == id && !x.IsDeleted, cancellationToken);
        if (sale is null)
            throw new ServiceException(404, "sale_not_found", "Sale was not found.");
        var productIds = await ValidateProductIdsAsync(request.ProductIds, cancellationToken);
        sale.Name = request.Name.Trim();
        sale.DiscountType = request.DiscountType;
        sale.DiscountValue = request.DiscountValue;
        sale.StartsAt = AsUtc(request.StartsAt);
        sale.EndsAt = AsUtc(request.EndsAt);
        sale.UpdatedAt = DateTime.UtcNow;
        db.SaleProducts.RemoveRange(sale.SaleProducts);
        sale.SaleProducts.Clear();
        foreach (var productId in productIds)
            sale.SaleProducts.Add(new SaleProduct { SaleId = sale.SaleId, ProductId = productId });
        audit.Record("Sales", id.ToString(), "Update", "Updated promotion terms, schedule, or eligibility.");
        await SaveWithConflictTranslationAsync(cancellationToken);
        return ToDto(sale);
    }

    public async Task SetSaleStatusAsync(int id, bool active, CancellationToken cancellationToken)
    {
        var sale = await db.Sales.SingleOrDefaultAsync(x => x.SaleId == id && !x.IsDeleted, cancellationToken);
        if (sale is null)
            throw new ServiceException(404, "sale_not_found", "Sale was not found.");
        sale.IsActive = active;
        sale.UpdatedAt = DateTime.UtcNow;
        audit.Record("Sales", id.ToString(), "Update", $"Set promotion active status to {active}.");
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteSaleAsync(int id, CancellationToken cancellationToken)
    {
        var sale = await db.Sales.SingleOrDefaultAsync(x => x.SaleId == id, cancellationToken);
        if (sale is null)
            throw new ServiceException(404, "sale_not_found", "Sale was not found.");
        sale.IsDeleted = true;
        sale.IsActive = false;
        sale.DeletedAt = DateTime.UtcNow;
        sale.UpdatedAt = DateTime.UtcNow;
        audit.Record("Sales", id.ToString(), "Delete", "Soft-deleted promotion.");
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<int[]> ValidateProductIdsAsync(IReadOnlyCollection<int> requested, CancellationToken cancellationToken)
    {
        var ids = requested.Distinct().ToArray();
        if (ids.Length == 0)
            throw new ServiceException(400, "sale_products_required", "At least one product must be eligible for a sale.");
        var count = await db.Products.CountAsync(x => ids.Contains(x.ProductId) && !x.IsDeleted, cancellationToken);
        if (count != ids.Length)
            throw new ServiceException(400, "invalid_sale_product", "One or more sale products do not exist or are deleted.");
        return ids;
    }

    private static void ValidateSale(SaleWriteRequest request)
    {
        if (request.DiscountType == DiscountTypes.Percentage)
        {
            if (request.DiscountValue is <= 0 or > 100)
                throw new ServiceException(400, "invalid_discount", "Percentage discounts must be greater than 0 and at most 100.");
        }
        else if (request.DiscountType == DiscountTypes.FixedAmount)
        {
            if (request.DiscountValue <= 0)
                throw new ServiceException(400, "invalid_discount", "Fixed discounts must be greater than zero.");
        }
        else
        {
            throw new ServiceException(400, "invalid_discount_type", "Discount type must be Percentage or FixedAmount.");
        }

        if (request.StartsAt.HasValue && request.EndsAt.HasValue &&
            AsUtc(request.EndsAt) < AsUtc(request.StartsAt))
            throw new ServiceException(400, "invalid_sale_window", "Sale end time must be after its start time.");
    }

    private async Task SaveWithConflictTranslationAsync(CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException { Number: 2601 or 2627 })
        {
            throw new ServiceException(409, "sale_conflict", "The sale conflicts with existing unique data.");
        }
    }

    private static SaleDto ToDto(Sale sale) =>
        new(sale.SaleId, sale.Name, sale.DiscountType, sale.DiscountValue, sale.StartsAt, sale.EndsAt, sale.IsActive);

    private static System.Linq.Expressions.Expression<Func<Sale, SaleDto>> ToDtoExpression() =>
        x => new SaleDto(x.SaleId, x.Name, x.DiscountType, x.DiscountValue, x.StartsAt, x.EndsAt, x.IsActive);

    private static DateTime? AsUtc(DateTime? value)
    {
        if (!value.HasValue)
            return null;
        return value.Value.Kind switch
        {
            DateTimeKind.Utc => value.Value,
            DateTimeKind.Local => value.Value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
        };
    }

    private static void ValidatePage(int page, int size)
    {
        if (page < 1 || size is < 1 or > 100)
            throw new ServiceException(400, "invalid_pagination", "Page number must be positive and page size must be between 1 and 100.");
    }
}

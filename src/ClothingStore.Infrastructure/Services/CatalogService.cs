using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using ClothingStore.Domain.Entities;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace ClothingStore.Infrastructure.Services;

internal sealed class CatalogService(
    ClothingStoreDbContext db,
    EffectivePriceResolver prices) : ICatalogService
{
    private static readonly string[] AllowedSorts = ["newest", "name", "price-asc", "price-desc", "popular"];

    public async Task<IReadOnlyList<DepartmentDto>> GetDepartmentsAsync(CancellationToken cancellationToken) =>
        await db.Departments.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Name)
            .Select(x => new DepartmentDto(x.DepartmentId, x.Name, x.Slug, x.SortOrder, x.IsActive))
            .ToListAsync(cancellationToken);

    public async Task<DepartmentDto?> GetDepartmentAsync(int id, CancellationToken cancellationToken) =>
        await db.Departments.AsNoTracking()
            .Where(x => x.DepartmentId == id && x.IsActive)
            .Select(x => new DepartmentDto(x.DepartmentId, x.Name, x.Slug, x.SortOrder, x.IsActive))
            .SingleOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<CategoryDto>> GetDepartmentCategoriesAsync(string slug, CancellationToken cancellationToken) =>
        await db.Categories.AsNoTracking()
            .Where(x => x.IsActive && !x.IsDeleted && x.Department.IsActive && x.Department.Slug == slug)
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Name)
            .Select(x => new CategoryDto(
                x.CategoryId,
                x.DepartmentId,
                x.ParentCategoryId,
                x.Name,
                x.Slug,
                x.SortOrder,
                x.ProductCategories.Count(pc => pc.Product.Status == "Active" && !pc.Product.IsDeleted),
                x.IsActive,
                x.IsDeleted))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(int? departmentId, CancellationToken cancellationToken)
    {
        var query = PublicCategories();
        if (departmentId.HasValue)
            query = query.Where(x => x.DepartmentId == departmentId.Value);

        return await query.OrderBy(x => x.SortOrder).ThenBy(x => x.Name)
            .Select(CategoryProjection())
            .ToListAsync(cancellationToken);
    }

    public async Task<CategoryDto?> GetCategoryAsync(int id, CancellationToken cancellationToken) =>
        await PublicCategories()
            .Where(x => x.CategoryId == id)
            .Select(CategoryProjection())
            .SingleOrDefaultAsync(cancellationToken);

    public async Task<CategoryDto?> GetCategoryBySlugAsync(string slug, CancellationToken cancellationToken) =>
        await PublicCategories()
            .Where(x => x.Slug == slug)
            .OrderBy(x => x.DepartmentId)
            .Select(CategoryProjection())
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<CategoryDto>> GetChildrenAsync(int id, CancellationToken cancellationToken) =>
        await PublicCategories()
            .Where(x => x.ParentCategoryId == id)
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Name)
            .Select(CategoryProjection())
            .ToListAsync(cancellationToken);

    public Task<PagedResult<ProductCardDto>> GetProductsAsync(ProductQuery query, CancellationToken cancellationToken)
    {
        ValidatePage(query.PageNumber, query.PageSize);
        if (!AllowedSorts.Contains(query.SortBy, StringComparer.OrdinalIgnoreCase))
            throw new ServiceException(400, "invalid_sort", "SortBy must be one of: newest, name, price-asc, price-desc, popular.");
        if (query.MinPrice is < 0 || query.MaxPrice is < 0 || query.MinPrice > query.MaxPrice)
            throw new ServiceException(400, "invalid_price_range", "The price range is invalid.");
        if (query.VolumeMl is <= 0)
            throw new ServiceException(400, "invalid_volume", "VolumeMl must be positive.");

        var queryable = PublicProducts();
        if (!string.IsNullOrWhiteSpace(query.Department))
            queryable = queryable.Where(p => p.ProductDepartments.Any(x =>
                x.Department.IsActive && x.Department.Slug == query.Department));
        if (!string.IsNullOrWhiteSpace(query.Category))
            queryable = queryable.Where(p => p.ProductCategories.Any(x =>
                x.Category.IsActive && !x.Category.IsDeleted && x.Category.Slug == query.Category));
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            queryable = queryable.Where(p =>
                p.Name.Contains(term) ||
                (p.Brand != null && p.Brand.Contains(term)) ||
                (p.Description != null && p.Description.Contains(term)));
        }
        if (query.ColorId.HasValue || query.SizeId.HasValue || query.VolumeMl.HasValue || query.Available.HasValue)
        {
            queryable = queryable.Where(p => p.Variants.Any(v =>
                v.IsActive && !v.IsDeleted &&
                (!query.ColorId.HasValue || v.ColorId == query.ColorId) &&
                (!query.SizeId.HasValue || v.SizeId == query.SizeId) &&
                (!query.VolumeMl.HasValue || v.VolumeMl == query.VolumeMl) &&
                (!query.Available.HasValue ||
                    (query.Available.Value
                        ? v.Inventory != null && v.Inventory.QuantityOnHand > v.Inventory.QuantityReserved
                        : v.Inventory == null || v.Inventory.QuantityOnHand <= v.Inventory.QuantityReserved))));
        }
        if (!string.IsNullOrWhiteSpace(query.Attribute))
        {
            var separator = query.Attribute.IndexOf(':');
            if (separator <= 0 || separator == query.Attribute.Length - 1)
                throw new ServiceException(400, "invalid_attribute_filter", "Attribute must use the format 'slug:value'.");
            var attributeSlug = query.Attribute[..separator].Trim();
            var attributeValue = query.Attribute[(separator + 1)..].Trim();
            queryable = queryable.Where(p => p.AttributeValues.Any(x =>
                x.ProductAttribute.IsActive &&
                x.ProductAttribute.Slug == attributeSlug &&
                x.AttributeValue == attributeValue));
        }
        if (query.OnSale == true)
        {
            var now = DateTime.UtcNow;
            queryable = queryable.Where(p => p.SaleProducts.Any(x =>
                x.Sale.IsActive && !x.Sale.IsDeleted && x.Sale.DiscountValue > 0 &&
                (x.Sale.StartsAt == null || x.Sale.StartsAt <= now) &&
                (x.Sale.EndsAt == null || x.Sale.EndsAt >= now)));
        }
        else if (query.OnSale == false)
        {
            var now = DateTime.UtcNow;
            queryable = queryable.Where(p => !p.SaleProducts.Any(x =>
                x.Sale.IsActive && !x.Sale.IsDeleted && x.Sale.DiscountValue > 0 &&
                (x.Sale.StartsAt == null || x.Sale.StartsAt <= now) &&
                (x.Sale.EndsAt == null || x.Sale.EndsAt >= now)));
        }
        if (query.MinPrice.HasValue || query.MaxPrice.HasValue)
        {
            var now = DateTime.UtcNow;
            var variantPrices = EffectiveVariantPrices(now);
            queryable = queryable.Where(p => variantPrices.Any(v =>
                v.ProductId == p.ProductId &&
                (!query.MinPrice.HasValue || v.EffectivePrice >= query.MinPrice.Value) &&
                (!query.MaxPrice.HasValue || v.EffectivePrice <= query.MaxPrice.Value)));
        }

        return GetProductPageAsync(queryable, query.SortBy, query.PageNumber, query.PageSize, cancellationToken);
    }

    public async Task<ProductDetailDto?> GetProductAsync(int id, CancellationToken cancellationToken)
    {
        var product = await LoadPublicProduct()
            .SingleOrDefaultAsync(x => x.ProductId == id, cancellationToken);
        return product is null ? null : await ToDetailAsync(product, cancellationToken);
    }

    public async Task<ProductDetailDto?> GetProductBySlugAsync(string slug, CancellationToken cancellationToken)
    {
        var product = await LoadPublicProduct()
            .SingleOrDefaultAsync(x => x.Slug == slug, cancellationToken);
        return product is null ? null : await ToDetailAsync(product, cancellationToken);
    }

    public Task<PagedResult<ProductCardDto>> GetFeaturedAsync(int page, int size, CancellationToken cancellationToken) =>
        GetProductPageAsync(PublicProducts(), "popular", page, size, cancellationToken);

    public Task<PagedResult<ProductCardDto>> GetNewArrivalsAsync(int page, int size, CancellationToken cancellationToken) =>
        GetProductPageAsync(PublicProducts(), "newest", page, size, cancellationToken);

    public Task<PagedResult<ProductCardDto>> GetOnSaleAsync(int page, int size, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var query = PublicProducts().Where(p => p.SaleProducts.Any(x =>
            x.Sale.IsActive && !x.Sale.IsDeleted && x.Sale.DiscountValue > 0 &&
            (x.Sale.StartsAt == null || x.Sale.StartsAt <= now) &&
            (x.Sale.EndsAt == null || x.Sale.EndsAt >= now)));
        return GetProductPageAsync(query, "newest", page, size, cancellationToken);
    }

    public async Task<PagedResult<ProductCardDto>> GetCategoryProductsAsync(
        int categoryId,
        int page,
        int size,
        CancellationToken cancellationToken)
    {
        var categoryExists = await PublicCategories().AnyAsync(x => x.CategoryId == categoryId, cancellationToken);
        if (!categoryExists)
            throw new ServiceException(404, "category_not_found", "Category was not found.");
        var products = PublicProducts().Where(x => x.ProductCategories.Any(pc => pc.CategoryId == categoryId));
        return await GetProductPageAsync(products, "newest", page, size, cancellationToken);
    }

    public async Task<IReadOnlyList<ProductVariantDto>> GetProductVariantsAsync(int productId, CancellationToken cancellationToken)
    {
        var product = await LoadPublicProduct()
            .SingleOrDefaultAsync(x => x.ProductId == productId, cancellationToken);
        if (product is null)
            throw new ServiceException(404, "product_not_found", "Product was not found.");
        return await ToVariantDtosAsync(product.Variants.Where(IsPurchasable).ToArray(), cancellationToken);
    }

    public async Task<ProductVariantDto?> GetVariantAsync(int id, CancellationToken cancellationToken)
    {
        var variant = await db.ProductVariants.AsNoTracking()
            .Include(x => x.Product)
            .Include(x => x.Color)
            .Include(x => x.Size)
            .Include(x => x.Inventory)
            .SingleOrDefaultAsync(x =>
                x.ProductVariantId == id &&
                x.IsActive && !x.IsDeleted &&
                x.Product.Status == "Active" && !x.Product.IsDeleted,
                cancellationToken);
        if (variant is null)
            return null;
        var result = await prices.ResolveAsync([variant], cancellationToken);
        return EffectivePriceResolver.ToDto(variant, result[variant.ProductVariantId]);
    }

    public async Task<IReadOnlyList<SaleDto>> GetActiveSalesAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        return await db.Sales.AsNoTracking()
            .Where(x => x.IsActive && !x.IsDeleted &&
                        (x.StartsAt == null || x.StartsAt <= now) &&
                        (x.EndsAt == null || x.EndsAt >= now))
            .OrderBy(x => x.Name)
            .Select(x => new SaleDto(x.SaleId, x.Name, x.DiscountType, x.DiscountValue, x.StartsAt, x.EndsAt, x.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<SaleDto?> GetSaleAsync(int id, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        return await db.Sales.AsNoTracking()
            .Where(x => x.SaleId == id && x.IsActive && !x.IsDeleted &&
                        (x.StartsAt == null || x.StartsAt <= now) &&
                        (x.EndsAt == null || x.EndsAt >= now))
            .Select(x => new SaleDto(x.SaleId, x.Name, x.DiscountType, x.DiscountValue, x.StartsAt, x.EndsAt, x.IsActive))
            .SingleOrDefaultAsync(cancellationToken);
    }

    private IQueryable<Category> PublicCategories() =>
        db.Categories.AsNoTracking()
            .Where(x => x.IsActive && !x.IsDeleted && x.Department.IsActive);

    private IQueryable<Product> PublicProducts() =>
        db.Products.AsNoTracking()
            .Where(x => x.Status == "Active" && !x.IsDeleted);

    private IQueryable<Product> LoadPublicProduct() =>
        db.Products.AsNoTracking()
            .Where(x => x.Status == "Active" && !x.IsDeleted)
            .Include(x => x.ProductDepartments).ThenInclude(x => x.Department)
            .Include(x => x.ProductCategories).ThenInclude(x => x.Category)
            .Include(x => x.Images).ThenInclude(x => x.Color)
            .Include(x => x.AttributeValues).ThenInclude(x => x.ProductAttribute)
            .Include(x => x.Variants).ThenInclude(x => x.Inventory)
            .Include(x => x.Variants).ThenInclude(x => x.Color)
            .Include(x => x.Variants).ThenInclude(x => x.Size)
            .AsSplitQuery();

    private static Expression<Func<Category, CategoryDto>> CategoryProjection() =>
        x => new CategoryDto(
            x.CategoryId,
            x.DepartmentId,
            x.ParentCategoryId,
            x.Name,
            x.Slug,
            x.SortOrder,
            x.ProductCategories.Count(pc => pc.Product.Status == "Active" && !pc.Product.IsDeleted),
            x.IsActive,
            x.IsDeleted);

    private async Task<PagedResult<ProductCardDto>> GetProductPageAsync(
        IQueryable<Product> query,
        string sortBy,
        int page,
        int size,
        CancellationToken cancellationToken)
    {
        ValidatePage(page, size);
        var count = await query.CountAsync(cancellationToken);
        var now = DateTime.UtcNow;
        var pricesQuery = EffectiveVariantPrices(now);

        IOrderedQueryable<Product> ordered = sortBy.ToLowerInvariant() switch
        {
            "name" => query.OrderBy(x => x.Name),
            "price-asc" => query.OrderBy(x => pricesQuery
                .Where(v => v.ProductId == x.ProductId)
                .Select(v => (decimal?)v.EffectivePrice)
                .Min()),
            "price-desc" => query.OrderByDescending(x => pricesQuery
                .Where(v => v.ProductId == x.ProductId)
                .Select(v => (decimal?)v.EffectivePrice)
                .Min()),
            "popular" => query.OrderByDescending(x =>
                db.OrderItems.Where(oi => oi.Order.Status != "Cancelled" &&
                    oi.ProductVariant != null &&
                    oi.ProductVariant.ProductId == x.ProductId)
                    .Sum(oi => (int?)oi.Quantity) ?? 0)
                .ThenByDescending(x => x.CreatedAt),
            _ => query.OrderByDescending(x => x.CreatedAt)
        };

        var products = await ordered
            .ThenBy(x => x.ProductId)
            .Skip((page - 1) * size)
            .Take(size)
            .Include(x => x.ProductDepartments).ThenInclude(x => x.Department)
            .Include(x => x.Variants).ThenInclude(x => x.Inventory)
            .Include(x => x.Images).ThenInclude(x => x.Color)
            .AsSplitQuery()
            .ToListAsync(cancellationToken);

        var variants = products.SelectMany(x => x.Variants.Where(IsPurchasable)).ToArray();
        var resolved = await prices.ResolveAsync(variants, cancellationToken);
        var cards = products.Select(product => MapCard(product, resolved)).ToArray();
        return new PagedResult<ProductCardDto>(cards, page, size, count);
    }

    private IQueryable<VariantPriceRow> EffectiveVariantPrices(DateTime now)
    {
        var eligibleSalePrices =
            from variant in db.ProductVariants.AsNoTracking()
            join eligibleProduct in db.SaleProducts.AsNoTracking()
                on variant.ProductId equals eligibleProduct.ProductId
            join sale in db.Sales.AsNoTracking()
                on eligibleProduct.SaleId equals sale.SaleId
            where variant.IsActive && !variant.IsDeleted &&
                  sale.IsActive && !sale.IsDeleted &&
                  (sale.StartsAt == null || sale.StartsAt <= now) &&
                  (sale.EndsAt == null || sale.EndsAt >= now)
            select new
            {
                variant.ProductVariantId,
                variant.ProductId,
                EffectivePrice = sale.DiscountType == "Percentage"
                    ? Math.Round(variant.RegularPrice * (1m - sale.DiscountValue / 100m), 2)
                    : variant.RegularPrice > sale.DiscountValue
                        ? variant.RegularPrice - sale.DiscountValue
                        : 0m
            };

        var bestSalePrices = eligibleSalePrices
            .GroupBy(x => new { x.ProductVariantId, x.ProductId })
            .Select(x => new
            {
                x.Key.ProductVariantId,
                x.Key.ProductId,
                EffectivePrice = x.Min(price => price.EffectivePrice)
            });

        var saleVariantPrices = bestSalePrices.Select(x => new VariantPriceRow
        {
            ProductId = x.ProductId,
            ProductVariantId = x.ProductVariantId,
            EffectivePrice = x.EffectivePrice
        });
        var regularVariantPrices = db.ProductVariants.AsNoTracking()
            .Where(variant => variant.IsActive && !variant.IsDeleted &&
                              !bestSalePrices.Any(sale => sale.ProductVariantId == variant.ProductVariantId))
            .Select(variant => new VariantPriceRow
            {
                ProductId = variant.ProductId,
                ProductVariantId = variant.ProductVariantId,
                EffectivePrice = variant.RegularPrice
            });

        return saleVariantPrices.Concat(regularVariantPrices);
    }

    private async Task<ProductDetailDto> ToDetailAsync(Product product, CancellationToken cancellationToken)
    {
        var variants = product.Variants.Where(IsPurchasable).ToArray();
        var variantDtos = await ToVariantDtosAsync(variants, cancellationToken);
        var productCategories = product.ProductCategories
            .Where(x => x.Category.IsActive && !x.Category.IsDeleted)
            .ToArray();
        var categoryIds = productCategories.Select(x => x.CategoryId).Distinct().ToArray();
        var categoryCounts = categoryIds.Length == 0
            ? new Dictionary<int, int>()
            : await db.ProductCategories.AsNoTracking()
                .Where(x => categoryIds.Contains(x.CategoryId) &&
                            x.Product.Status == "Active" &&
                            !x.Product.IsDeleted)
                .GroupBy(x => x.CategoryId)
                .Select(x => new { CategoryId = x.Key, Count = x.Count() })
                .ToDictionaryAsync(x => x.CategoryId, x => x.Count, cancellationToken);
        var categories = productCategories
            .Select(x => new CategoryDto(
                x.Category.CategoryId,
                x.Category.DepartmentId,
                x.Category.ParentCategoryId,
                x.Category.Name,
                x.Category.Slug,
                x.Category.SortOrder,
                categoryCounts.GetValueOrDefault(x.CategoryId),
                x.Category.IsActive,
                x.Category.IsDeleted))
            .DistinctBy(x => x.CategoryId)
            .ToArray();
        var departments = product.ProductDepartments
            .Where(x => x.Department.IsActive)
            .Select(x => new DepartmentDto(x.Department.DepartmentId, x.Department.Name, x.Department.Slug, x.Department.SortOrder, x.Department.IsActive))
            .DistinctBy(x => x.DepartmentId)
            .ToArray();
        var images = product.Images
            .OrderBy(x => x.ColorId.HasValue)
            .ThenBy(x => x.Color?.SortOrder ?? 0)
            .ThenByDescending(x => x.IsPrimary)
            .ThenBy(x => x.DisplayOrder)
            .Select(x => new ProductImageDto(
                x.ProductImageId,
                x.ImageUrl,
                x.AltText,
                x.DisplayOrder,
                x.IsPrimary,
                x.ColorId,
                x.Color == null ? null : x.Color.Name))
            .ToArray();
        var attributes = product.AttributeValues
            .Where(x => x.ProductAttribute.IsActive)
            .Select(x => new ProductAttributeDto(x.ProductAttribute.Name, x.ProductAttribute.Slug, x.AttributeValue))
            .ToArray();

        return new ProductDetailDto(
            product.ProductId,
            product.Name,
            product.Slug,
            product.Description,
            product.Brand,
            product.Status,
            product.IsDeleted,
            product.CreatedAt,
            categories,
            departments,
            images,
            attributes,
            variantDtos);
    }

    private async Task<IReadOnlyList<ProductVariantDto>> ToVariantDtosAsync(
        IReadOnlyCollection<ProductVariant> variants,
        CancellationToken cancellationToken)
    {
        if (variants.Count == 0)
            return [];
        var resolved = await prices.ResolveAsync(variants, cancellationToken);
        return variants
            .Select(x => EffectivePriceResolver.ToDto(x, resolved[x.ProductVariantId]))
            .ToArray();
    }

    private static ProductCardDto MapCard(
        Product product,
        IReadOnlyDictionary<int, Application.Contracts.EffectivePrice> resolved)
    {
        var variants = product.Variants.Where(IsPurchasable).ToArray();
        var variantPrices = variants
            .Select(x => resolved[x.ProductVariantId])
            .ToArray();
        return new ProductCardDto(
            product.ProductId,
            product.Name,
            product.Slug,
            product.Brand,
            product.Images
                .OrderBy(x => x.ColorId.HasValue)
                .ThenBy(x => x.Color?.SortOrder ?? 0)
                .ThenByDescending(x => x.IsPrimary)
                .ThenBy(x => x.DisplayOrder)
                .FirstOrDefault()?.ImageUrl,
            variantPrices.Length == 0 ? null : variantPrices.Min(x => x.Amount),
            variantPrices.Length == 0 ? null : variantPrices.Max(x => x.Amount),
            variantPrices.Any(x => x.IsOnSale),
            variants.Any(x => EffectivePriceResolver.Available(x) > 0));
    }

    private static bool IsPurchasable(ProductVariant variant) =>
        variant.IsActive && !variant.IsDeleted;

    private static void ValidatePage(int page, int size)
    {
        if (page < 1 || size is < 1 or > 100)
            throw new ServiceException(400, "invalid_pagination", "Page number must be positive and page size must be between 1 and 100.");
    }

    private sealed class VariantPriceRow
    {
        public int ProductId { get; init; }
        public int ProductVariantId { get; init; }
        public decimal EffectivePrice { get; init; }
    }
}

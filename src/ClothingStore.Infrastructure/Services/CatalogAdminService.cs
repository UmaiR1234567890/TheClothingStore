using System.Text;
using ClothingStore.Application.Contracts;
using ClothingStore.Application.DTOs;
using ClothingStore.Domain.Constants;
using ClothingStore.Domain.Entities;
using ClothingStore.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.Infrastructure.Services;

internal sealed class CatalogAdminService(
    ClothingStoreDbContext db,
    EffectivePriceResolver prices,
    AuditLogWriter audit) : ICatalogAdminService
{
    public async Task<PagedResult<AdminProductCardDto>> GetProductsAsync(
        int page,
        int size,
        string? search,
        CancellationToken cancellationToken)
    {
        ValidatePage(page, size);
        var query = db.Products.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(x => x.Name.Contains(term) || x.Slug.Contains(term) ||
                (x.Brand != null && x.Brand.Contains(term)));
        }
        var count = await query.CountAsync(cancellationToken);
        var products = await query.OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Include(x => x.Images).ThenInclude(x => x.Color)
            .Include(x => x.Variants).ThenInclude(x => x.Inventory)
            .ToListAsync(cancellationToken);
        var variants = products.SelectMany(x => x.Variants).ToArray();
        var pricesById = variants.Length == 0
            ? new Dictionary<int, Application.Contracts.EffectivePrice>()
            : await prices.ResolveAsync(variants, cancellationToken);
        var cards = products.Select(x =>
        {
            var productVariants = x.Variants;
            var priceRows = productVariants.Select(v => pricesById[v.ProductVariantId]).ToArray();
            return new AdminProductCardDto(
                x.ProductId,
                x.Name,
                x.Slug,
                x.Brand,
                x.Status,
                x.IsDeleted,
                x.Images
                    .OrderBy(i => i.ColorId.HasValue)
                    .ThenByDescending(i => i.IsPrimary)
                    .ThenBy(i => i.Color?.SortOrder ?? int.MaxValue)
                    .ThenBy(i => i.DisplayOrder)
                    .FirstOrDefault()?.ImageUrl,
                priceRows.Length == 0 ? null : priceRows.Min(v => v.Amount),
                priceRows.Length == 0 ? null : priceRows.Max(v => v.Amount),
                productVariants.Count);
        }).ToArray();
        return new PagedResult<AdminProductCardDto>(cards, page, size, count);
    }

    public async Task<ProductDetailDto> GetProductAsync(int productId, CancellationToken cancellationToken)
    {
        var product = await LoadProductAsync(productId, cancellationToken);
        return await ToDetailAsync(product, cancellationToken);
    }

    public async Task<ProductDetailDto> CreateProductAsync(ProductWriteRequest request, CancellationToken cancellationToken)
    {
        ValidateProductStatus(request.Status);
        var (departmentIds, categoryIds, attributeIds) = await ValidateProductLinksAsync(request, cancellationToken);
        var product = new Product
        {
            Name = request.Name.Trim(),
            Slug = request.Slug.Trim(),
            Description = request.Description,
            Brand = Normalize(request.Brand),
            Status = request.Status,
            IsDeleted = false
        };
        foreach (var id in departmentIds)
            product.ProductDepartments.Add(new ProductDepartment { DepartmentId = id, Product = product });
        foreach (var id in categoryIds)
            product.ProductCategories.Add(new ProductCategory { CategoryId = id, Product = product });
        foreach (var input in request.Attributes)
        {
            var attributeId = attributeIds[input.Slug.Trim().ToLowerInvariant()];
            product.AttributeValues.Add(new ProductAttributeValue
            {
                ProductAttributeId = attributeId,
                AttributeValue = input.Value.Trim(),
                Product = product
            });
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        db.Products.Add(product);
        await SaveWithConflictTranslationAsync(cancellationToken);
        audit.Record("Products", product.ProductId.ToString(), "Insert", $"Created product '{product.Slug}'.");
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return await GetProductAsync(product.ProductId, cancellationToken);
    }

    public async Task<ProductDetailDto> UpdateProductAsync(
        int productId,
        ProductWriteRequest request,
        CancellationToken cancellationToken)
    {
        ValidateProductStatus(request.Status);
        var product = await LoadProductAsync(productId, cancellationToken);
        var (departmentIds, categoryIds, attributeIds) = await ValidateProductLinksAsync(request, cancellationToken);
        product.Name = request.Name.Trim();
        product.Slug = request.Slug.Trim();
        product.Description = request.Description;
        product.Brand = Normalize(request.Brand);
        product.Status = request.Status;
        product.UpdatedAt = DateTime.UtcNow;

        db.ProductDepartments.RemoveRange(product.ProductDepartments);
        db.ProductCategories.RemoveRange(product.ProductCategories);
        db.ProductAttributeValues.RemoveRange(product.AttributeValues);
        product.ProductDepartments.Clear();
        product.ProductCategories.Clear();
        product.AttributeValues.Clear();
        foreach (var id in departmentIds)
            product.ProductDepartments.Add(new ProductDepartment { ProductId = productId, DepartmentId = id });
        foreach (var id in categoryIds)
            product.ProductCategories.Add(new ProductCategory { ProductId = productId, CategoryId = id });
        foreach (var input in request.Attributes)
            product.AttributeValues.Add(new ProductAttributeValue
            {
                ProductId = productId,
                ProductAttributeId = attributeIds[input.Slug.Trim().ToLowerInvariant()],
                AttributeValue = input.Value.Trim()
            });

        audit.Record("Products", productId.ToString(), "Update", "Updated product details and catalog mappings.");
        await SaveWithConflictTranslationAsync(cancellationToken);
        return await GetProductAsync(productId, cancellationToken);
    }

    public async Task SetProductStatusAsync(int productId, string status, CancellationToken cancellationToken)
    {
        ValidateProductStatus(status);
        var product = await db.Products.SingleOrDefaultAsync(x => x.ProductId == productId, cancellationToken);
        if (product is null)
            throw new ServiceException(404, "product_not_found", "Product was not found.");
        if (product.IsDeleted && status == ProductStatuses.Active)
            throw new ServiceException(409, "product_deleted", "A soft-deleted product cannot be activated.");
        product.Status = status;
        product.UpdatedAt = DateTime.UtcNow;
        audit.Record("Products", productId.ToString(), "Update", $"Changed product status to {status}.");
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteProductAsync(int productId, CancellationToken cancellationToken)
    {
        var product = await db.Products.SingleOrDefaultAsync(x => x.ProductId == productId, cancellationToken);
        if (product is null)
            throw new ServiceException(404, "product_not_found", "Product was not found.");
        product.IsDeleted = true;
        product.DeletedAt = DateTime.UtcNow;
        product.Status = ProductStatuses.Inactive;
        product.UpdatedAt = DateTime.UtcNow;
        audit.Record("Products", productId.ToString(), "Delete", "Soft-deleted product.");
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<ProductVariantDto> CreateVariantAsync(
        int productId,
        VariantWriteRequest request,
        CancellationToken cancellationToken)
    {
        var productExists = await db.Products.AnyAsync(x => x.ProductId == productId && !x.IsDeleted, cancellationToken);
        if (!productExists)
            throw new ServiceException(404, "product_not_found", "Product was not found.");
        await ValidateVariantOptionsAsync(productId, request, cancellationToken);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var variant = new ProductVariant
        {
            ProductId = productId,
            Sku = request.Sku.Trim(),
            ColorId = request.ColorId,
            SizeId = request.SizeId,
            VolumeMl = request.VolumeMl,
            RegularPrice = request.RegularPrice,
            IsActive = request.IsActive,
            IsDeleted = false
        };
        db.ProductVariants.Add(variant);
        await SaveWithConflictTranslationAsync(cancellationToken);
        db.Inventory.Add(new Inventory { ProductVariantId = variant.ProductVariantId });
        audit.Record("ProductVariants", variant.ProductVariantId.ToString(), "Insert", $"Created variant SKU {variant.Sku}.");
        await SaveWithConflictTranslationAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return await LoadVariantDtoAsync(variant.ProductVariantId, cancellationToken);
    }

    public async Task<IReadOnlyList<ProductVariantDto>> CreateVariantsAsync(
        int productId,
        VariantBulkWriteRequest request,
        CancellationToken cancellationToken)
    {
        var productExists = await db.Products.AnyAsync(x => x.ProductId == productId && !x.IsDeleted, cancellationToken);
        if (!productExists)
            throw new ServiceException(404, "product_not_found", "Product was not found.");

        var requests = request.Variants;
        if (requests.Select(x => x.Sku.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() != requests.Count)
            throw new ServiceException(400, "duplicate_sku", "Each variant in a bulk request must have a unique SKU.");

        foreach (var item in requests)
            await ValidateVariantOptionsAsync(productId, item, cancellationToken);

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var now = DateTime.UtcNow;
        var created = new List<ProductVariant>(requests.Count);
        foreach (var item in requests)
        {
            var variant = new ProductVariant
            {
                ProductId = productId,
                Sku = item.Sku.Trim(),
                ColorId = item.ColorId,
                SizeId = item.SizeId,
                VolumeMl = item.VolumeMl,
                RegularPrice = item.RegularPrice,
                IsActive = item.IsActive,
                IsDeleted = false
            };
            db.ProductVariants.Add(variant);
            created.Add(variant);
        }
        await SaveWithConflictTranslationAsync(cancellationToken);

        foreach (var variant in created)
        {
            var inventory = new Inventory
            {
                ProductVariantId = variant.ProductVariantId,
                QuantityOnHand = Math.Max(0, request.InitialStock),
                UpdatedAt = now
            };
            db.Inventory.Add(inventory);
            audit.Record("ProductVariants", variant.ProductVariantId.ToString(), "Insert", $"Created variant SKU {variant.Sku} (bulk).");
        }
        await SaveWithConflictTranslationAsync(cancellationToken);

        if (request.InitialStock > 0)
        {
            foreach (var variant in created)
            {
                var inventory = db.Inventory.Local.Single(x => x.ProductVariantId == variant.ProductVariantId);
                db.InventoryTransactions.Add(new InventoryTransaction
                {
                    InventoryId = inventory.InventoryId,
                    TransactionType = InventoryTransactionTypes.Adjustment,
                    QuantityChange = request.InitialStock,
                    QuantityAfter = request.InitialStock,
                    ReferenceType = "AdminAdjustment",
                    Notes = "Initial stock set at variant creation."
                });
            }
            await db.SaveChangesAsync(cancellationToken);
        }
        await transaction.CommitAsync(cancellationToken);

        var ids = created.Select(x => x.ProductVariantId).ToArray();
        var variants = await db.ProductVariants
            .Include(x => x.Inventory)
            .Include(x => x.Color)
            .Include(x => x.Size)
            .Where(x => ids.Contains(x.ProductVariantId))
            .ToListAsync(cancellationToken);
        var priceMap = await prices.ResolveAsync(variants.ToArray(), cancellationToken);
        return variants.Select(x => EffectivePriceResolver.ToDto(x, priceMap[x.ProductVariantId])).ToArray();
    }

    public async Task<ProductVariantDto> UpdateVariantAsync(
        int variantId,
        VariantWriteRequest request,
        CancellationToken cancellationToken)
    {
        var variant = await db.ProductVariants.SingleOrDefaultAsync(x => x.ProductVariantId == variantId, cancellationToken);
        if (variant is null)
            throw new ServiceException(404, "variant_not_found", "Variant was not found.");
        await ValidateVariantOptionsAsync(variant.ProductId, request, cancellationToken);
        variant.Sku = request.Sku.Trim();
        variant.ColorId = request.ColorId;
        variant.SizeId = request.SizeId;
        variant.VolumeMl = request.VolumeMl;
        variant.RegularPrice = request.RegularPrice;
        variant.IsActive = request.IsActive && !variant.IsDeleted;
        variant.UpdatedAt = DateTime.UtcNow;
        audit.Record("ProductVariants", variantId.ToString(), "Update", "Updated variant SKU, options, price, or status.");
        await SaveWithConflictTranslationAsync(cancellationToken);
        return await LoadVariantDtoAsync(variantId, cancellationToken);
    }

    public async Task SetVariantStatusAsync(int variantId, bool active, CancellationToken cancellationToken)
    {
        var variant = await db.ProductVariants.SingleOrDefaultAsync(x => x.ProductVariantId == variantId, cancellationToken);
        if (variant is null)
            throw new ServiceException(404, "variant_not_found", "Variant was not found.");
        if (variant.IsDeleted && active)
            throw new ServiceException(409, "variant_deleted", "A soft-deleted variant cannot be activated.");
        variant.IsActive = active;
        variant.UpdatedAt = DateTime.UtcNow;
        audit.Record("ProductVariants", variantId.ToString(), "Update", $"Set variant active status to {active}.");
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<ProductImageDto> CreateImageAsync(
        int productId,
        ProductImageWriteRequest request,
        CancellationToken cancellationToken)
    {
        var exists = await db.Products.AnyAsync(x => x.ProductId == productId && !x.IsDeleted, cancellationToken);
        if (!exists)
            throw new ServiceException(404, "product_not_found", "Product was not found.");
        await ValidateImageColorAsync(productId, request.ColorId, null, cancellationToken);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        if (request.IsPrimary)
            await SetNoOtherPrimaryAsync(productId, request.ColorId, null, cancellationToken);
        var image = new ProductImage
        {
            ProductId = productId,
            ColorId = request.ColorId,
            ImageUrl = request.ImageUrl.Trim(),
            AltText = Normalize(request.AltText),
            DisplayOrder = request.DisplayOrder,
            IsPrimary = request.IsPrimary
        };
        db.ProductImages.Add(image);
        await SaveWithConflictTranslationAsync(cancellationToken);
        if (image.ColorId.HasValue)
            await db.Entry(image).Reference(x => x.Color).LoadAsync(cancellationToken);
        audit.Record("ProductImages", image.ProductImageId.ToString(), "Insert", $"Added image to product {productId}.");
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ToImageDto(image);
    }

    public async Task<ProductImageDto> UpdateImageAsync(
        int imageId,
        ProductImageWriteRequest request,
        CancellationToken cancellationToken)
    {
        var image = await db.ProductImages.SingleOrDefaultAsync(x => x.ProductImageId == imageId, cancellationToken);
        if (image is null)
            throw new ServiceException(404, "image_not_found", "Image was not found.");
        await ValidateImageColorAsync(image.ProductId, request.ColorId, imageId, cancellationToken);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        if (request.IsPrimary)
            await SetNoOtherPrimaryAsync(image.ProductId, request.ColorId, imageId, cancellationToken);
        image.ColorId = request.ColorId;
        image.ImageUrl = request.ImageUrl.Trim();
        image.AltText = Normalize(request.AltText);
        image.DisplayOrder = request.DisplayOrder;
        image.IsPrimary = request.IsPrimary;
        if (image.ColorId.HasValue)
            await db.Entry(image).Reference(x => x.Color).LoadAsync(cancellationToken);
        audit.Record("ProductImages", imageId.ToString(), "Update", "Updated product image metadata.");
        await SaveWithConflictTranslationAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ToImageDto(image);
    }

    public async Task DeleteImageAsync(int imageId, CancellationToken cancellationToken)
    {
        var image = await db.ProductImages.SingleOrDefaultAsync(x => x.ProductImageId == imageId, cancellationToken);
        if (image is null)
            throw new ServiceException(404, "image_not_found", "Image was not found.");
        db.ProductImages.Remove(image);
        audit.Record("ProductImages", imageId.ToString(), "Delete", "Removed product image.");
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task SetPrimaryImageAsync(int imageId, CancellationToken cancellationToken)
    {
        var image = await db.ProductImages.SingleOrDefaultAsync(x => x.ProductImageId == imageId, cancellationToken);
        if (image is null)
            throw new ServiceException(404, "image_not_found", "Image was not found.");
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await SetNoOtherPrimaryAsync(image.ProductId, image.ColorId, imageId, cancellationToken);
        image.IsPrimary = true;
        audit.Record("ProductImages", imageId.ToString(), "Update", "Selected primary product image.");
        await SaveWithConflictTranslationAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<DepartmentDto>> GetAdminDepartmentsAsync(CancellationToken cancellationToken) =>
        await db.Departments.AsNoTracking()
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Name)
            .Select(x => new DepartmentDto(x.DepartmentId, x.Name, x.Slug, x.SortOrder, x.IsActive))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ColorOptionDto>> GetAdminColorsAsync(CancellationToken cancellationToken) =>
        await db.Colors.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Name)
            .Select(x => new ColorOptionDto(x.ColorId, x.Name, x.HexCode, x.SortOrder, x.IsActive))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<SizeOptionDto>> GetAdminSizesAsync(CancellationToken cancellationToken) =>
        await db.Sizes.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SizeType).ThenBy(x => x.SortOrder).ThenBy(x => x.Name)
            .Select(x => new SizeOptionDto(x.SizeId, x.SizeType, x.Name, x.SortOrder, x.IsActive))
            .ToListAsync(cancellationToken);

    public async Task<DepartmentDto> CreateDepartmentAsync(DepartmentWriteRequest request, CancellationToken cancellationToken)
    {
        var department = new Department
        {
            Name = request.Name.Trim(),
            Slug = request.Slug.Trim(),
            SortOrder = request.SortOrder,
            IsActive = true
        };
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        db.Departments.Add(department);
        await SaveWithConflictTranslationAsync(cancellationToken);
        audit.Record("Departments", department.DepartmentId.ToString(), "Insert", $"Created department '{department.Slug}'.");
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ToDepartmentDto(department);
    }

    public async Task<DepartmentDto> UpdateDepartmentAsync(
        int id,
        DepartmentWriteRequest request,
        CancellationToken cancellationToken)
    {
        var department = await db.Departments.SingleOrDefaultAsync(x => x.DepartmentId == id, cancellationToken);
        if (department is null)
            throw new ServiceException(404, "department_not_found", "Department was not found.");
        department.Name = request.Name.Trim();
        department.Slug = request.Slug.Trim();
        department.SortOrder = request.SortOrder;
        department.UpdatedAt = DateTime.UtcNow;
        audit.Record("Departments", id.ToString(), "Update", "Updated department details.");
        await SaveWithConflictTranslationAsync(cancellationToken);
        return ToDepartmentDto(department);
    }

    public async Task SetDepartmentStatusAsync(int id, bool active, CancellationToken cancellationToken)
    {
        var department = await db.Departments.SingleOrDefaultAsync(x => x.DepartmentId == id, cancellationToken);
        if (department is null)
            throw new ServiceException(404, "department_not_found", "Department was not found.");
        department.IsActive = active;
        department.UpdatedAt = DateTime.UtcNow;
        audit.Record("Departments", id.ToString(), "Update", $"Set department active status to {active}.");
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<CategoryDto>> GetAdminCategoriesAsync(int? departmentId, CancellationToken cancellationToken)
    {
        var query = db.Categories.AsNoTracking();
        if (departmentId.HasValue)
            query = query.Where(x => x.DepartmentId == departmentId.Value);
        return await query.OrderBy(x => x.DepartmentId).ThenBy(x => x.SortOrder).ThenBy(x => x.Name)
            .Select(x => new CategoryDto(
                x.CategoryId, x.DepartmentId, x.ParentCategoryId, x.Name, x.Slug, x.SortOrder, 0, x.IsActive, x.IsDeleted))
            .ToListAsync(cancellationToken);
    }

    public async Task<CategoryDto> CreateCategoryAsync(CategoryWriteRequest request, CancellationToken cancellationToken)
    {
        await ValidateCategoryParentAsync(request.DepartmentId, request.ParentCategoryId, null, cancellationToken);
        var category = new Category
        {
            DepartmentId = request.DepartmentId,
            ParentCategoryId = request.ParentCategoryId,
            Name = request.Name.Trim(),
            Slug = request.Slug.Trim(),
            SortOrder = request.SortOrder,
            IsActive = true,
            IsDeleted = false
        };
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        db.Categories.Add(category);
        await SaveWithConflictTranslationAsync(cancellationToken);
        audit.Record("Categories", category.CategoryId.ToString(), "Insert", $"Created category '{category.Slug}'.");
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ToCategoryDto(category);
    }

    public async Task<CategoryDto> EnsureCategoryPathAsync(string path, CancellationToken cancellationToken)
    {
        var segments = (path ?? string.Empty)
            .Split('>', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => x.Length > 0)
            .ToArray();
        if (segments.Length < 2)
            throw new ServiceException(400, "category_path_invalid",
                "Provide a path like 'Men > Shirts > Slim Fit' — a department followed by at least one category.");

        var root = segments[0].ToLowerInvariant();
        var department = await db.Departments.SingleOrDefaultAsync(
            x => x.IsActive && (x.Name.ToLower() == root || x.Slug.ToLower() == root),
            cancellationToken);
        if (department is null)
            throw new ServiceException(404, "department_not_found", $"Department '{segments[0]}' was not found.");

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        int? parentId = null;
        Category? current = null;
        foreach (var segment in segments.Skip(1))
        {
            var match = segment.ToLowerInvariant();
            var slug = Slugify(segment);
            current = await db.Categories
                .Where(x =>
                    x.DepartmentId == department.DepartmentId &&
                    x.ParentCategoryId == parentId &&
                    !x.IsDeleted &&
                    (x.Name.ToLower() == match || x.Slug == slug || x.Slug.ToLower() == match))
                .OrderByDescending(x => x.IsActive)
                .FirstOrDefaultAsync(cancellationToken);
            if (current is null)
            {
                slug = await UniqueCategorySlugAsync(slug, cancellationToken);
                var maxSort = await db.Categories
                    .Where(x => x.DepartmentId == department.DepartmentId && x.ParentCategoryId == parentId && !x.IsDeleted)
                    .Select(x => (int?)x.SortOrder)
                    .MaxAsync(cancellationToken) ?? -1;
                current = new Category
                {
                    DepartmentId = department.DepartmentId,
                    ParentCategoryId = parentId,
                    Name = segment,
                    Slug = slug,
                    SortOrder = maxSort + 1,
                    IsActive = true,
                    IsDeleted = false
                };
                db.Categories.Add(current);
                await SaveWithConflictTranslationAsync(cancellationToken);
                audit.Record("Categories", current.CategoryId.ToString(), "Insert",
                    $"Created category '{current.Slug}' from path '{path}'.");
                await db.SaveChangesAsync(cancellationToken);
            }
            parentId = current.CategoryId;
        }
        await transaction.CommitAsync(cancellationToken);
        return ToCategoryDto(current!);
    }

    private async Task<string> UniqueCategorySlugAsync(string baseSlug, CancellationToken cancellationToken)
    {
        var slug = baseSlug;
        var index = 2;
        while (await db.Categories.AnyAsync(x => x.Slug == slug, cancellationToken))
            slug = $"{baseSlug}-{index++}";
        return slug;
    }

    private static string Slugify(string value)
    {
        var builder = new StringBuilder(value.Length);
        var dash = false;
        foreach (var c in value.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(c))
            {
                builder.Append(c);
                dash = false;
            }
            else if (!dash && builder.Length > 0)
            {
                builder.Append('-');
                dash = true;
            }
        }
        var slug = builder.ToString().Trim('-');
        return slug.Length == 0 ? "category" : slug;
    }

    public async Task<CategoryDto> UpdateCategoryAsync(
        int id,
        CategoryWriteRequest request,
        CancellationToken cancellationToken)
    {
        var category = await db.Categories.SingleOrDefaultAsync(x => x.CategoryId == id, cancellationToken);
        if (category is null)
            throw new ServiceException(404, "category_not_found", "Category was not found.");
        if (category.DepartmentId != request.DepartmentId)
        {
            var hasChildren = await db.Categories.AnyAsync(x => x.ParentCategoryId == id && !x.IsDeleted, cancellationToken);
            var isMapped = await db.ProductCategories.AnyAsync(x => x.CategoryId == id, cancellationToken);
            if (hasChildren || isMapped)
                throw new ServiceException(409, "category_department_in_use", "A category with children or product mappings cannot be moved to another department.");
        }
        await ValidateCategoryParentAsync(request.DepartmentId, request.ParentCategoryId, id, cancellationToken);
        category.DepartmentId = request.DepartmentId;
        category.ParentCategoryId = request.ParentCategoryId;
        category.Name = request.Name.Trim();
        category.Slug = request.Slug.Trim();
        category.SortOrder = request.SortOrder;
        category.UpdatedAt = DateTime.UtcNow;
        audit.Record("Categories", id.ToString(), "Update", "Updated category details and hierarchy.");
        await SaveWithConflictTranslationAsync(cancellationToken);
        return ToCategoryDto(category);
    }

    public async Task SetCategoryStatusAsync(int id, bool active, CancellationToken cancellationToken)
    {
        var category = await db.Categories.SingleOrDefaultAsync(x => x.CategoryId == id, cancellationToken);
        if (category is null)
            throw new ServiceException(404, "category_not_found", "Category was not found.");
        category.IsActive = active;
        category.UpdatedAt = DateTime.UtcNow;
        audit.Record("Categories", id.ToString(), "Update", $"Set category active status to {active}.");
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteCategoryAsync(int id, CancellationToken cancellationToken)
    {
        var category = await db.Categories.SingleOrDefaultAsync(x => x.CategoryId == id, cancellationToken);
        if (category is null)
            throw new ServiceException(404, "category_not_found", "Category was not found.");
        var hasChildren = await db.Categories.AnyAsync(x => x.ParentCategoryId == id && !x.IsDeleted, cancellationToken);
        if (hasChildren)
            throw new ServiceException(409, "category_has_children", "Move or delete child categories before deleting this category.");
        category.IsDeleted = true;
        category.IsActive = false;
        category.DeletedAt = DateTime.UtcNow;
        category.UpdatedAt = DateTime.UtcNow;
        audit.Record("Categories", id.ToString(), "Delete", "Soft-deleted category.");
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ProductAttributeDefinitionDto>> GetAttributeDefinitionsAsync(
        CancellationToken cancellationToken) =>
        await db.ProductAttributes.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ProductAttributeDefinitionDto(
                x.ProductAttributeId, x.Name, x.Slug, x.IsActive))
            .ToListAsync(cancellationToken);

    public async Task<ProductAttributeDefinitionDto> CreateAttributeDefinitionAsync(
        ProductAttributeDefinitionWriteRequest request,
        CancellationToken cancellationToken)
    {
        var attribute = new ProductAttribute
        {
            Name = request.Name.Trim(),
            Slug = request.Slug.Trim(),
            IsActive = true
        };
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        db.ProductAttributes.Add(attribute);
        await SaveWithConflictTranslationAsync(cancellationToken);
        audit.Record("ProductAttributes", attribute.ProductAttributeId.ToString(), "Insert", $"Created attribute '{attribute.Slug}'.");
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ToAttributeDefinitionDto(attribute);
    }

    public async Task<ProductAttributeDefinitionDto> UpdateAttributeDefinitionAsync(
        int id,
        ProductAttributeDefinitionWriteRequest request,
        CancellationToken cancellationToken)
    {
        var attribute = await db.ProductAttributes.SingleOrDefaultAsync(
            x => x.ProductAttributeId == id,
            cancellationToken);
        if (attribute is null)
            throw new ServiceException(404, "attribute_not_found", "Product attribute was not found.");
        attribute.Name = request.Name.Trim();
        attribute.Slug = request.Slug.Trim();
        audit.Record("ProductAttributes", id.ToString(), "Update", "Updated product attribute definition.");
        await SaveWithConflictTranslationAsync(cancellationToken);
        return ToAttributeDefinitionDto(attribute);
    }

    public async Task SetAttributeDefinitionStatusAsync(int id, bool active, CancellationToken cancellationToken)
    {
        var attribute = await db.ProductAttributes.SingleOrDefaultAsync(
            x => x.ProductAttributeId == id,
            cancellationToken);
        if (attribute is null)
            throw new ServiceException(404, "attribute_not_found", "Product attribute was not found.");
        attribute.IsActive = active;
        audit.Record("ProductAttributes", id.ToString(), "Update", $"Set attribute active status to {active}.");
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<Product> LoadProductAsync(int productId, CancellationToken cancellationToken)
    {
        var product = await db.Products
            .Include(x => x.ProductDepartments).ThenInclude(x => x.Department)
            .Include(x => x.ProductCategories).ThenInclude(x => x.Category)
            .Include(x => x.Images).ThenInclude(x => x.Color)
            .Include(x => x.AttributeValues).ThenInclude(x => x.ProductAttribute)
            .Include(x => x.Variants).ThenInclude(x => x.Inventory)
            .Include(x => x.Variants).ThenInclude(x => x.Color)
            .Include(x => x.Variants).ThenInclude(x => x.Size)
            .AsSplitQuery()
            .SingleOrDefaultAsync(x => x.ProductId == productId, cancellationToken);
        return product ?? throw new ServiceException(404, "product_not_found", "Product was not found.");
    }

    private async Task<(int[] Departments, int[] Categories, Dictionary<string, int> Attributes)> ValidateProductLinksAsync(
        ProductWriteRequest request,
        CancellationToken cancellationToken)
    {
        var departmentIds = request.DepartmentIds.Distinct().ToArray();
        var categoryIds = request.CategoryIds.Distinct().ToArray();
        if (departmentIds.Length == 0)
            throw new ServiceException(400, "department_required", "At least one department is required.");
        var foundDepartments = await db.Departments
            .Where(x => departmentIds.Contains(x.DepartmentId) && x.IsActive)
            .Select(x => x.DepartmentId)
            .ToArrayAsync(cancellationToken);
        if (foundDepartments.Length != departmentIds.Length)
            throw new ServiceException(400, "invalid_department", "One or more departments are invalid or inactive.");

        if (categoryIds.Length > 0)
        {
            var categories = await db.Categories
                .Where(x => categoryIds.Contains(x.CategoryId) && x.IsActive && !x.IsDeleted)
                .Select(x => new { x.CategoryId, x.DepartmentId })
                .ToListAsync(cancellationToken);
            if (categories.Count != categoryIds.Length || categories.Any(x => !departmentIds.Contains(x.DepartmentId)))
                throw new ServiceException(400, "invalid_category", "Categories must be active and belong to a selected department.");
        }

        var attributeSlugs = request.Attributes.Select(x => x.Slug.Trim().ToLowerInvariant()).ToArray();
        if (attributeSlugs.Distinct(StringComparer.OrdinalIgnoreCase).Count() != attributeSlugs.Length)
            throw new ServiceException(400, "duplicate_attribute", "Each product attribute can be supplied only once.");
        var attributes = await db.ProductAttributes
            .Where(x => attributeSlugs.Contains(x.Slug.ToLower()) && x.IsActive)
            .Select(x => new { x.Slug, x.ProductAttributeId })
            .ToDictionaryAsync(x => x.Slug.ToLower(), x => x.ProductAttributeId, cancellationToken);
        if (attributes.Count != attributeSlugs.Length)
            throw new ServiceException(400, "invalid_attribute", "One or more product attributes are unknown or inactive.");
        return (departmentIds, categoryIds, attributes);
    }

    private async Task ValidateVariantOptionsAsync(
        int productId,
        VariantWriteRequest request,
        CancellationToken cancellationToken)
    {
        if (request.ColorId.HasValue &&
            !await db.Colors.AnyAsync(x => x.ColorId == request.ColorId && x.IsActive, cancellationToken))
            throw new ServiceException(400, "invalid_color", "The selected color is inactive or does not exist.");
        if (request.VolumeMl.HasValue && (request.ColorId.HasValue || request.SizeId.HasValue))
            throw new ServiceException(400, "invalid_variant_options", "Volume variants cannot also specify color or size.");

        var categorySlugs = await db.ProductCategories
            .Where(x => x.ProductId == productId)
            .Select(x => x.Category.Slug.ToLower())
            .ToListAsync(cancellationToken);
        var isPerfume = categorySlugs.Contains("perfumes");
        var isFootwear = categorySlugs.Contains("footwear") || categorySlugs.Contains("shoes");
        if (isPerfume && (!request.VolumeMl.HasValue || request.ColorId.HasValue || request.SizeId.HasValue))
            throw new ServiceException(400, "invalid_perfume_variant", "Perfume variants must specify volume and cannot specify color or size.");

        if (request.SizeId.HasValue)
        {
            var sizeType = await db.Sizes
                .Where(x => x.SizeId == request.SizeId && x.IsActive)
                .Select(x => x.SizeType)
                .SingleOrDefaultAsync(cancellationToken);
            if (sizeType is null)
                throw new ServiceException(400, "invalid_size", "The selected size is inactive or does not exist.");
            if ((isFootwear && sizeType != "Footwear") || (!isFootwear && sizeType != "Clothing"))
                throw new ServiceException(400, "invalid_size_type", "The selected size type does not match the product category.");
        }
    }

    public async Task<IReadOnlyList<SizeGroupDto>> GetSizeGroupsAsync(CancellationToken cancellationToken) =>
        await db.SizeGroups.AsNoTracking()
            .Include(x => x.Sizes)
            .OrderBy(x => x.SortOrder).ThenBy(x => x.GroupName)
            .Select(x => new SizeGroupDto(
                x.SizeGroupId, x.GroupName, x.IsActive, x.SortOrder,
                x.Sizes.Where(s => s.IsActive).OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
                    .Select(s => new SizeOptionDto(s.SizeId, s.SizeType, s.Name, s.SortOrder, s.IsActive)).ToList()))
            .ToListAsync(cancellationToken);

    public async Task<SizeGroupDto> CreateSizeGroupAsync(SizeGroupWriteRequest request, CancellationToken cancellationToken)
    {
        var name = request.GroupName.Trim();
        if (await db.SizeGroups.AnyAsync(x => x.GroupName.ToLower() == name.ToLower(), cancellationToken))
            throw new ServiceException(409, "duplicate_size_group", "A size group with this name already exists.");
        var group = new SizeGroup { GroupName = name, SortOrder = request.SortOrder, IsActive = request.IsActive };
        db.SizeGroups.Add(group);
        await db.SaveChangesAsync(cancellationToken);
        return new SizeGroupDto(group.SizeGroupId, group.GroupName, group.IsActive, group.SortOrder, []);
    }

    public async Task<SizeGroupDto> UpdateSizeGroupAsync(int id, SizeGroupWriteRequest request, CancellationToken cancellationToken)
    {
        var group = await db.SizeGroups.FindAsync([id], cancellationToken)
            ?? throw new ServiceException(404, "size_group_not_found", "The size group does not exist.");
        var name = request.GroupName.Trim();
        if (await db.SizeGroups.AnyAsync(x => x.SizeGroupId != id && x.GroupName.ToLower() == name.ToLower(), cancellationToken))
            throw new ServiceException(409, "duplicate_size_group", "A size group with this name already exists.");
        group.GroupName = name;
        group.SortOrder = request.SortOrder;
        group.IsActive = request.IsActive;
        await db.SaveChangesAsync(cancellationToken);
        return (await GetSizeGroupsAsync(cancellationToken)).Single(x => x.SizeGroupId == id);
    }

    public async Task DeleteSizeGroupAsync(int id, CancellationToken cancellationToken)
    {
        var group = await db.SizeGroups.Include(x => x.Sizes).SingleOrDefaultAsync(x => x.SizeGroupId == id, cancellationToken)
            ?? throw new ServiceException(404, "size_group_not_found", "The size group does not exist.");
        if (await db.ProductVariants.AnyAsync(x => x.SizeId.HasValue && group.Sizes.Select(s => s.SizeId).Contains(x.SizeId.Value) && !x.IsDeleted, cancellationToken))
            throw new ServiceException(409, "size_group_in_use", "This size group is used by product variants and cannot be deleted.");
        db.Sizes.RemoveRange(group.Sizes);
        db.SizeGroups.Remove(group);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<SizeOptionDto> AddSizeGroupItemAsync(int groupId, SizeGroupItemWriteRequest request, CancellationToken cancellationToken)
    {
        var group = await db.SizeGroups.FindAsync([groupId], cancellationToken)
            ?? throw new ServiceException(404, "size_group_not_found", "The size group does not exist.");
        var name = request.Name.Trim();
        var sizeType = group.GroupName.Contains("Shoe", StringComparison.OrdinalIgnoreCase) ||
                       group.GroupName.Contains("Footwear", StringComparison.OrdinalIgnoreCase)
            ? "Footwear" : "Clothing";
        if (await db.Sizes.AnyAsync(x => x.SizeType == sizeType && x.Name.ToLower() == name.ToLower(), cancellationToken))
            throw new ServiceException(409, "duplicate_size", "A size with this value already exists.");
        var size = new Size
        {
            SizeGroupId = groupId,
            SizeType = sizeType,
            Name = name,
            SortOrder = request.SortOrder != 0 ? request.SortOrder : (group.Sizes.Count == 0 ? 1 : group.Sizes.Max(x => x.SortOrder) + 1),
            IsActive = true,
        };
        db.Sizes.Add(size);
        await db.SaveChangesAsync(cancellationToken);
        return new SizeOptionDto(size.SizeId, size.SizeType, size.Name, size.SortOrder, size.IsActive);
    }

    public async Task RemoveSizeGroupItemAsync(int groupId, int sizeId, CancellationToken cancellationToken)
    {
        var size = await db.Sizes.SingleOrDefaultAsync(x => x.SizeId == sizeId && x.SizeGroupId == groupId, cancellationToken)
            ?? throw new ServiceException(404, "size_not_found", "The size does not exist in this group.");
        if (await db.ProductVariants.AnyAsync(x => x.SizeId == sizeId && !x.IsDeleted, cancellationToken))
            throw new ServiceException(409, "size_in_use", "This size is used by product variants and cannot be removed.");
        db.Sizes.Remove(size);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<ColorOptionDto> CreateColorAsync(ColorWriteRequest request, CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();
        if (await db.Colors.AnyAsync(x => x.Name.ToLower() == name.ToLower(), cancellationToken))
            throw new ServiceException(409, "duplicate_color", "A color with this name already exists.");
        var color = new Color { Name = name, HexCode = request.HexCode, SortOrder = request.SortOrder, IsActive = request.IsActive };
        db.Colors.Add(color);
        await db.SaveChangesAsync(cancellationToken);
        return new ColorOptionDto(color.ColorId, color.Name, color.HexCode, color.SortOrder, color.IsActive);
    }

    public async Task<ColorOptionDto> UpdateColorAsync(int id, ColorWriteRequest request, CancellationToken cancellationToken)
    {
        var color = await db.Colors.FindAsync([id], cancellationToken)
            ?? throw new ServiceException(404, "color_not_found", "The color does not exist.");
        var name = request.Name.Trim();
        if (await db.Colors.AnyAsync(x => x.ColorId != id && x.Name.ToLower() == name.ToLower(), cancellationToken))
            throw new ServiceException(409, "duplicate_color", "A color with this name already exists.");
        color.Name = name;
        color.HexCode = request.HexCode;
        color.SortOrder = request.SortOrder;
        color.IsActive = request.IsActive;
        await db.SaveChangesAsync(cancellationToken);
        return new ColorOptionDto(color.ColorId, color.Name, color.HexCode, color.SortOrder, color.IsActive);
    }

    public async Task DeleteColorAsync(int id, CancellationToken cancellationToken)
    {
        var color = await db.Colors.FindAsync([id], cancellationToken)
            ?? throw new ServiceException(404, "color_not_found", "The color does not exist.");
        if (await db.ProductVariants.AnyAsync(x => x.ColorId == id && !x.IsDeleted, cancellationToken))
            throw new ServiceException(409, "color_in_use", "This color is used by product variants and cannot be deleted.");
        db.Colors.Remove(color);
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task ValidateCategoryParentAsync(
        int departmentId,
        int? parentId,
        int? currentId,
        CancellationToken cancellationToken)
    {
        if (!await db.Departments.AnyAsync(x => x.DepartmentId == departmentId && x.IsActive, cancellationToken))
            throw new ServiceException(400, "invalid_department", "The selected department is inactive or does not exist.");
        if (!parentId.HasValue)
            return;
        if (currentId == parentId.Value)
            throw new ServiceException(400, "category_cycle", "A category cannot be its own parent.");
        var parent = await db.Categories.AsNoTracking()
            .SingleOrDefaultAsync(x => x.CategoryId == parentId.Value && !x.IsDeleted, cancellationToken);
        if (parent is null || parent.DepartmentId != departmentId)
            throw new ServiceException(400, "invalid_parent_category", "Parent category must exist in the same department.");

        var ancestorId = parent.ParentCategoryId;
        while (ancestorId.HasValue)
        {
            if (currentId == ancestorId.Value)
                throw new ServiceException(400, "category_cycle", "The selected parent would create a category cycle.");
            ancestorId = await db.Categories.AsNoTracking()
                .Where(x => x.CategoryId == ancestorId.Value)
                .Select(x => x.ParentCategoryId)
                .SingleOrDefaultAsync(cancellationToken);
        }
    }

    private async Task<ProductVariantDto> LoadVariantDtoAsync(int variantId, CancellationToken cancellationToken)
    {
        var variant = await db.ProductVariants
            .Include(x => x.Inventory)
            .Include(x => x.Color)
            .Include(x => x.Size)
            .SingleAsync(x => x.ProductVariantId == variantId, cancellationToken);
        var price = (await prices.ResolveAsync([variant], cancellationToken))[variantId];
        return EffectivePriceResolver.ToDto(variant, price);
    }

    private async Task ValidateImageColorAsync(
        int productId,
        int? colorId,
        int? exceptImageId,
        CancellationToken cancellationToken)
    {
        if (colorId.HasValue &&
            !await db.ProductVariants.AnyAsync(
                x => x.ProductId == productId &&
                     x.ColorId == colorId.Value &&
                     x.IsActive &&
                     !x.IsDeleted,
                cancellationToken))
        {
            throw new ServiceException(
                400,
                "image_color_not_available",
                "The selected color must be used by an active variant of this product.");
        }

        var imageCount = await db.ProductImages.CountAsync(
            x => x.ProductId == productId &&
                 x.ColorId == colorId &&
                 (!exceptImageId.HasValue || x.ProductImageId != exceptImageId.Value),
            cancellationToken);
        if (imageCount >= 20)
        {
            throw new ServiceException(
                400,
                "image_limit_per_color",
                "A product can have at most twenty images in each color gallery.");
        }
    }

    private async Task SetNoOtherPrimaryAsync(
        int productId,
        int? colorId,
        int? exceptImageId,
        CancellationToken cancellationToken)
    {
        var query = db.ProductImages.Where(x =>
            x.ProductId == productId &&
            x.ColorId == colorId &&
            x.IsPrimary);
        if (exceptImageId.HasValue)
            query = query.Where(x => x.ProductImageId != exceptImageId.Value);
        await query.ExecuteUpdateAsync(x => x.SetProperty(y => y.IsPrimary, false), cancellationToken);
    }

    private async Task<ProductDetailDto> ToDetailAsync(Product product, CancellationToken cancellationToken)
    {
        var variantPrices = product.Variants.Count == 0
            ? new Dictionary<int, Application.Contracts.EffectivePrice>()
            : await prices.ResolveAsync(product.Variants.ToArray(), cancellationToken);
        var variants = product.Variants
            .Select(x => EffectivePriceResolver.ToDto(x, variantPrices[x.ProductVariantId]))
            .ToArray();
        var categoryIds = product.ProductCategories.Select(x => x.CategoryId).Distinct().ToArray();
        var categoryCounts = categoryIds.Length == 0
            ? new Dictionary<int, int>()
            : await db.ProductCategories.AsNoTracking()
                .Where(x => categoryIds.Contains(x.CategoryId) &&
                            x.Product.Status == ProductStatuses.Active &&
                            !x.Product.IsDeleted)
                .GroupBy(x => x.CategoryId)
                .Select(x => new { CategoryId = x.Key, Count = x.Count() })
                .ToDictionaryAsync(x => x.CategoryId, x => x.Count, cancellationToken);
        return new ProductDetailDto(
            product.ProductId,
            product.Name,
            product.Slug,
            product.Description,
            product.Brand,
            product.Status,
            product.IsDeleted,
            product.CreatedAt,
            product.ProductCategories.Select(x => new CategoryDto(
                x.Category.CategoryId, x.Category.DepartmentId, x.Category.ParentCategoryId,
                x.Category.Name, x.Category.Slug, x.Category.SortOrder,
                categoryCounts.GetValueOrDefault(x.CategoryId),
                x.Category.IsActive, x.Category.IsDeleted)).ToArray(),
            product.ProductDepartments.Select(x => new DepartmentDto(
                x.Department.DepartmentId, x.Department.Name, x.Department.Slug, x.Department.SortOrder, x.Department.IsActive)).ToArray(),
            product.Images
                .OrderBy(x => x.ColorId.HasValue)
                .ThenBy(x => x.Color?.SortOrder ?? int.MaxValue)
                .ThenByDescending(x => x.IsPrimary)
                .ThenBy(x => x.DisplayOrder)
                .Select(ToImageDto).ToArray(),
            product.AttributeValues.Select(x => new ProductAttributeDto(
                x.ProductAttribute.Name, x.ProductAttribute.Slug, x.AttributeValue)).ToArray(),
            variants);
    }

    private static ProductImageDto ToImageDto(ProductImage image) =>
        new(
            image.ProductImageId,
            image.ImageUrl,
            image.AltText,
            image.DisplayOrder,
            image.IsPrimary,
            image.ColorId,
            image.Color?.Name);

    private static DepartmentDto ToDepartmentDto(Department item) =>
        new(item.DepartmentId, item.Name, item.Slug, item.SortOrder, item.IsActive);

    private static CategoryDto ToCategoryDto(Category item) =>
        new(item.CategoryId, item.DepartmentId, item.ParentCategoryId, item.Name, item.Slug, item.SortOrder, 0, item.IsActive, item.IsDeleted);

    private static ProductAttributeDefinitionDto ToAttributeDefinitionDto(ProductAttribute attribute) =>
        new(attribute.ProductAttributeId, attribute.Name, attribute.Slug, attribute.IsActive);

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void ValidateProductStatus(string status)
    {
        if (status is not (ProductStatuses.Draft or ProductStatuses.Active or ProductStatuses.Inactive))
            throw new ServiceException(400, "invalid_product_status", "The product status is invalid.");
    }

    private async Task SaveWithConflictTranslationAsync(CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException { Number: 2601 or 2627 })
        {
            throw new ServiceException(409, "catalog_conflict", "A unique catalog value is already in use.");
        }
    }

    private static void ValidatePage(int page, int size)
    {
        if (page < 1 || size is < 1 or > 100)
            throw new ServiceException(400, "invalid_pagination", "Page number must be positive and page size must be between 1 and 100.");
    }
}

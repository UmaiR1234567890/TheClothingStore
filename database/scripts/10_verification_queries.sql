USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

SET NOCOUNT ON;

PRINT N'=== Tables ===';
SELECT t.name AS TableName
FROM sys.tables t
WHERE t.is_ms_shipped = 0
ORDER BY t.name;

PRINT N'=== Foreign keys ===';
SELECT fk.name AS ForeignKeyName, OBJECT_NAME(fk.parent_object_id) AS ChildTable, OBJECT_NAME(fk.referenced_object_id) AS ParentTable, fk.delete_referential_action_desc AS OnDelete
FROM sys.foreign_keys fk
ORDER BY ChildTable, ForeignKeyName;

PRINT N'=== Unique indexes / constraints ===';
SELECT OBJECT_NAME(i.object_id) AS TableName, i.name AS IndexName, i.is_unique, i.has_filter, i.filter_definition
FROM sys.indexes i
WHERE i.is_unique = 1 AND i.object_id IN (SELECT object_id FROM sys.tables)
ORDER BY TableName, IndexName;

PRINT N'=== Check constraints ===';
SELECT OBJECT_NAME(parent_object_id) AS TableName, name AS CheckName
FROM sys.check_constraints
ORDER BY TableName, CheckName;

PRINT N'=== Seed counts ===';
SELECT N'Departments' AS Entity, COUNT(*) AS RowCnt FROM dbo.Departments
UNION ALL SELECT N'Categories', COUNT(*) FROM dbo.Categories
UNION ALL SELECT N'Colors', COUNT(*) FROM dbo.Colors
UNION ALL SELECT N'Sizes', COUNT(*) FROM dbo.Sizes
UNION ALL SELECT N'ProductAttributes', COUNT(*) FROM dbo.ProductAttributes
UNION ALL SELECT N'Products', COUNT(*) FROM dbo.Products
UNION ALL SELECT N'ProductVariants', COUNT(*) FROM dbo.ProductVariants
UNION ALL SELECT N'ProductImages', COUNT(*) FROM dbo.ProductImages
UNION ALL SELECT N'Inventory', COUNT(*) FROM dbo.Inventory
UNION ALL SELECT N'Sales', COUNT(*) FROM dbo.Sales
UNION ALL SELECT N'Carts', COUNT(*) FROM dbo.Carts
UNION ALL SELECT N'Orders', COUNT(*) FROM dbo.Orders
UNION ALL SELECT N'NewsletterSubscriptions', COUNT(*) FROM dbo.NewsletterSubscriptions;

PRINT N'=== Department / category filter (Men casual shirts) ===';
SELECT p.Name, c.Name AS CategoryName, d.Name AS DepartmentName
FROM dbo.Products p
INNER JOIN dbo.ProductCategories pc ON pc.ProductId = p.ProductId
INNER JOIN dbo.Categories c ON c.CategoryId = pc.CategoryId
INNER JOIN dbo.Departments d ON d.DepartmentId = c.DepartmentId
WHERE d.Slug = N'men' AND c.Slug = N'casual-shirts';

PRINT N'=== Variant selection (shirt + perfume) ===';
SELECT p.Name, pv.Sku, col.Name AS ColorName, sz.Name AS SizeName, sz.SizeType, pv.VolumeMl, pv.RegularPrice
FROM dbo.ProductVariants pv
INNER JOIN dbo.Products p ON p.ProductId = pv.ProductId
LEFT JOIN dbo.Colors col ON col.ColorId = pv.ColorId
LEFT JOIN dbo.Sizes sz ON sz.SizeId = pv.SizeId
WHERE p.Slug IN (N'men-cotton-casual-shirt', N'women-woody-edp')
ORDER BY p.Name, pv.Sku;

PRINT N'=== Inventory available qty ===';
SELECT pv.Sku, i.QuantityOnHand, i.QuantityReserved, (i.QuantityOnHand - i.QuantityReserved) AS QuantityAvailable
FROM dbo.Inventory i
INNER JOIN dbo.ProductVariants pv ON pv.ProductVariantId = i.ProductVariantId
ORDER BY pv.Sku;

PRINT N'=== Sale pricing ===';
SELECT
    pv.Sku,
    pv.RegularPrice,
    s.Name AS SaleName,
    s.DiscountType,
    s.DiscountValue,
    CASE
        WHEN s.DiscountType = N'Percentage' THEN ROUND(pv.RegularPrice * (1 - s.DiscountValue / 100.0), 2)
        ELSE CASE WHEN pv.RegularPrice - s.DiscountValue < 0 THEN CAST(0 AS DECIMAL(18, 2)) ELSE pv.RegularPrice - s.DiscountValue END
    END AS EffectivePrice
FROM dbo.ProductVariants pv
INNER JOIN dbo.Products p ON p.ProductId = pv.ProductId
INNER JOIN dbo.SaleProducts sp ON sp.ProductId = p.ProductId
INNER JOIN dbo.Sales s ON s.SaleId = sp.SaleId
WHERE s.IsActive = 1 AND s.IsDeleted = 0
  AND (s.StartsAt IS NULL OR s.StartsAt <= SYSUTCDATETIME())
  AND (s.EndsAt IS NULL OR s.EndsAt >= SYSUTCDATETIME());

PRINT N'=== Carts ===';
SELECT c.CartId, c.CustomerId, c.GuestToken, ci.Quantity, pv.Sku
FROM dbo.Carts c
INNER JOIN dbo.CartItems ci ON ci.CartId = c.CartId
INNER JOIN dbo.ProductVariants pv ON pv.ProductVariantId = ci.ProductVariantId;

PRINT N'=== Historical order items ===';
SELECT o.OrderNumber, oi.ProductName, oi.Sku, oi.VariantDetails, oi.Quantity, oi.UnitPrice, oi.DiscountAmount, oi.LineTotal
FROM dbo.Orders o
INNER JOIN dbo.OrderItems oi ON oi.OrderId = o.OrderId;

PRINT N'=== Newsletter uniqueness ===';
SELECT Email, COUNT(*) AS Cnt
FROM dbo.NewsletterSubscriptions
GROUP BY Email
HAVING COUNT(*) > 1;

PRINT N'=== Identity-conflicting tables (should be empty) ===';
SELECT name
FROM sys.tables
WHERE name IN (N'Roles', N'AdminUsers', N'AdminUserRoles', N'AspNetUsers', N'AspNetRoles');
GO

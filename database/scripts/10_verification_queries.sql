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
;WITH EligiblePrices AS
(
    SELECT
        pv.ProductVariantId,
        pv.Sku,
        pv.RegularPrice,
        s.Name AS SaleName,
        s.DiscountType,
        s.DiscountValue,
        CASE
            WHEN s.DiscountType = N'Percentage'
                THEN ROUND(pv.RegularPrice * (1 - s.DiscountValue / 100.0), 2)
            ELSE CASE
                WHEN pv.RegularPrice - s.DiscountValue < 0 THEN CAST(0 AS DECIMAL(18, 2))
                ELSE pv.RegularPrice - s.DiscountValue
            END
        END AS EffectivePrice
    FROM dbo.ProductVariants pv
    INNER JOIN dbo.Products p ON p.ProductId = pv.ProductId
    INNER JOIN dbo.SaleProducts sp ON sp.ProductId = p.ProductId
    INNER JOIN dbo.Sales s ON s.SaleId = sp.SaleId
    WHERE s.IsActive = 1 AND s.IsDeleted = 0
      AND (s.StartsAt IS NULL OR s.StartsAt <= SYSUTCDATETIME())
      AND (s.EndsAt IS NULL OR s.EndsAt >= SYSUTCDATETIME())
),
RankedPrices AS
(
    SELECT *, ROW_NUMBER() OVER (PARTITION BY ProductVariantId ORDER BY EffectivePrice, SaleName) AS PriceRank
    FROM EligiblePrices
)
SELECT Sku, RegularPrice, SaleName, DiscountType, DiscountValue, EffectivePrice
FROM RankedPrices
WHERE PriceRank = 1;

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

PRINT N'=== Optional Identity schema status ===';
SELECT CASE
    WHEN OBJECT_ID(N'dbo.AspNetUsers', N'U') IS NOT NULL
     AND OBJECT_ID(N'dbo.AspNetRoles', N'U') IS NOT NULL
        THEN N'Provisioned'
    ELSE N'Not provisioned'
END AS IdentitySchemaStatus;

PRINT N'=== Legacy custom security tables (should be absent) ===';
SELECT name
FROM sys.tables
WHERE name IN (N'Roles', N'AdminUsers', N'AdminUserRoles');

PRINT N'=== Required schema assertions ===';
DECLARE @ExpectedTables TABLE (TableName SYSNAME NOT NULL PRIMARY KEY);
INSERT INTO @ExpectedTables (TableName)
VALUES
    (N'Departments'), (N'Colors'), (N'Sizes'), (N'ProductAttributes'),
    (N'Categories'), (N'Products'), (N'ProductDepartments'), (N'ProductCategories'),
    (N'ProductVariants'), (N'ProductImages'), (N'ProductAttributeValues'),
    (N'Sales'), (N'SaleProducts'), (N'Inventory'), (N'InventoryTransactions'),
    (N'Customers'), (N'CustomerAddresses'), (N'Carts'), (N'CartItems'),
    (N'Orders'), (N'OrderItems'), (N'Payments'), (N'Shipments'),
    (N'NewsletterSubscriptions'), (N'AuditLogs');

IF EXISTS
(
    SELECT 1
    FROM @ExpectedTables e
    LEFT JOIN sys.tables t ON t.name = e.TableName AND SCHEMA_NAME(t.schema_id) = N'dbo'
    WHERE t.object_id IS NULL
)
BEGIN
    SELECT e.TableName AS MissingTable
    FROM @ExpectedTables e
    LEFT JOIN sys.tables t ON t.name = e.TableName AND SCHEMA_NAME(t.schema_id) = N'dbo'
    WHERE t.object_id IS NULL;
    ;THROW 51000, N'One or more expected dbo tables are missing.', 1;
END;

IF EXISTS
(
    SELECT 1
    FROM sys.foreign_keys
    WHERE is_disabled = 1 OR is_not_trusted = 1
)
BEGIN
    ;THROW 51001, N'A foreign key is disabled or untrusted.', 1;
END;

IF EXISTS
(
    SELECT 1
    FROM sys.check_constraints
    WHERE is_disabled = 1 OR is_not_trusted = 1
)
BEGIN
    ;THROW 51002, N'A check constraint is disabled or untrusted.', 1;
END;

IF EXISTS
(
    SELECT 1
    FROM (VALUES
        (N'UX_Customers_IdentityUserId'), (N'UX_Carts_CustomerId'),
        (N'UX_Carts_GuestToken'), (N'UX_ProductImages_Primary'),
        (N'IX_Categories_ParentCategoryId'), (N'IX_ProductDepartments_DepartmentId'),
        (N'IX_ProductCategories_CategoryId'), (N'IX_Products_Status'),
        (N'IX_ProductVariants_ProductId'), (N'IX_ProductVariants_ColorId'),
        (N'IX_ProductVariants_SizeId'), (N'IX_ProductImages_ProductId'),
        (N'IX_ProductAttributeValues_AttributeId'), (N'IX_SaleProducts_ProductId'),
        (N'IX_Sales_ActiveWindow'), (N'IX_InventoryTransactions_InventoryId'),
        (N'IX_Orders_CustomerId'), (N'IX_OrderItems_OrderId'),
        (N'IX_OrderItems_ProductVariantId'), (N'IX_Payments_OrderId'),
        (N'IX_Shipments_OrderId'), (N'IX_AuditLogs_Entity'),
        (N'IX_CustomerAddresses_CustomerId'), (N'IX_CartItems_ProductVariantId')
    ) expected(IndexName)
    LEFT JOIN sys.indexes actual ON actual.name = expected.IndexName
        AND actual.is_disabled = 0
    WHERE actual.index_id IS NULL
)
BEGIN
    ;THROW 51003, N'One or more expected supporting indexes are missing or disabled.', 1;
END;

IF COL_LENGTH(N'dbo.ProductImages', N'ColorId') IS NOT NULL
   AND NOT EXISTS
   (
       SELECT 1
       FROM sys.indexes
       WHERE name = N'IX_ProductImages_Product_Color_DisplayOrder'
         AND object_id = OBJECT_ID(N'dbo.ProductImages')
         AND is_disabled = 0
   )
BEGIN
    ;THROW 51009, N'The product/color image display-order index is missing or disabled.', 1;
END;

IF EXISTS (SELECT 1 FROM dbo.Inventory WHERE QuantityOnHand < 0 OR QuantityReserved < 0 OR QuantityReserved > QuantityOnHand)
BEGIN
    ;THROW 51004, N'Inventory contains an invalid stock quantity.', 1;
END;

IF EXISTS
(
    SELECT 1
    FROM dbo.ProductVariants pv
    LEFT JOIN dbo.Inventory i ON i.ProductVariantId = pv.ProductVariantId
    WHERE i.InventoryId IS NULL
)
BEGIN
    ;THROW 51005, N'A product variant has no inventory row.', 1;
END;

IF EXISTS (SELECT 1 FROM dbo.NewsletterSubscriptions GROUP BY Email HAVING COUNT(*) > 1)
BEGIN
    ;THROW 51006, N'Newsletter email uniqueness check failed.', 1;
END;

IF
(
    SELECT COUNT(*)
    FROM dbo.Departments
    WHERE Slug IN (N'men', N'women', N'kids')
) <> 3
BEGIN
    ;THROW 51007, N'One or more required seeded departments are missing.', 1;
END;

IF EXISTS (SELECT 1 FROM dbo.Products WHERE Slug = N'men-leather-oxford')
   AND NOT EXISTS
   (
       SELECT 1
       FROM dbo.ProductVariants pv
       INNER JOIN dbo.Products p ON p.ProductId = pv.ProductId
       INNER JOIN dbo.Sizes sz ON sz.SizeId = pv.SizeId
       WHERE p.Slug = N'men-leather-oxford'
         AND sz.SizeType = N'Footwear'
   )
BEGIN
    ;THROW 51008, N'The seeded shoe product has no footwear-size variant.', 1;
END;

IF EXISTS (SELECT 1 FROM dbo.Products WHERE Slug = N'women-woody-edp')
   AND NOT EXISTS
   (
       SELECT 1
       FROM dbo.ProductVariants pv
       INNER JOIN dbo.Products p ON p.ProductId = pv.ProductId
       WHERE p.Slug = N'women-woody-edp'
         AND pv.VolumeMl IS NOT NULL
   )
BEGIN
    ;THROW 51010, N'The seeded perfume product has no volume variant.', 1;
END;

IF NOT EXISTS
(
    SELECT 1
    FROM dbo.Products
    WHERE Slug IN (N'men-leather-oxford', N'women-woody-edp')
)
    PRINT N'No optional shoe/perfume seed products found; sample-specific checks were skipped.';

PRINT N'All required schema and data-integrity assertions passed.';
GO

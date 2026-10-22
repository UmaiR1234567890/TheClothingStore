USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Filtered unique indexes (NULL-safe) and lookup indexes.
-- Core PKs, FKs, and CHECKs live in scripts 01-06.

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Customers_IdentityUserId' AND object_id = OBJECT_ID(N'dbo.Customers'))
    CREATE UNIQUE INDEX UX_Customers_IdentityUserId
        ON dbo.Customers (IdentityUserId)
        WHERE IdentityUserId IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Carts_CustomerId' AND object_id = OBJECT_ID(N'dbo.Carts'))
    CREATE UNIQUE INDEX UX_Carts_CustomerId
        ON dbo.Carts (CustomerId)
        WHERE CustomerId IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Carts_GuestToken' AND object_id = OBJECT_ID(N'dbo.Carts'))
    CREATE UNIQUE INDEX UX_Carts_GuestToken
        ON dbo.Carts (GuestToken)
        WHERE GuestToken IS NOT NULL;
GO

IF COL_LENGTH(N'dbo.ProductImages', N'ColorId') IS NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_ProductImages_Primary' AND object_id = OBJECT_ID(N'dbo.ProductImages'))
        CREATE UNIQUE INDEX UX_ProductImages_Primary
            ON dbo.ProductImages (ProductId)
            WHERE IsPrimary = 1;
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_ProductImages_Primary' AND object_id = OBJECT_ID(N'dbo.ProductImages'))
        CREATE UNIQUE INDEX UX_ProductImages_Primary
            ON dbo.ProductImages (ProductId, ColorId)
            WHERE IsPrimary = 1;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProductImages_Product_Color_DisplayOrder' AND object_id = OBJECT_ID(N'dbo.ProductImages'))
        CREATE INDEX IX_ProductImages_Product_Color_DisplayOrder
            ON dbo.ProductImages (ProductId, ColorId, DisplayOrder);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Categories_ParentCategoryId' AND object_id = OBJECT_ID(N'dbo.Categories'))
    CREATE INDEX IX_Categories_ParentCategoryId ON dbo.Categories (ParentCategoryId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProductDepartments_DepartmentId' AND object_id = OBJECT_ID(N'dbo.ProductDepartments'))
    CREATE INDEX IX_ProductDepartments_DepartmentId ON dbo.ProductDepartments (DepartmentId, ProductId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProductCategories_CategoryId' AND object_id = OBJECT_ID(N'dbo.ProductCategories'))
    CREATE INDEX IX_ProductCategories_CategoryId ON dbo.ProductCategories (CategoryId, ProductId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Products_Status' AND object_id = OBJECT_ID(N'dbo.Products'))
    CREATE INDEX IX_Products_Status ON dbo.Products (Status) WHERE IsDeleted = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProductVariants_ProductId' AND object_id = OBJECT_ID(N'dbo.ProductVariants'))
    CREATE INDEX IX_ProductVariants_ProductId ON dbo.ProductVariants (ProductId) INCLUDE (Sku, RegularPrice, IsActive);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProductVariants_ColorId' AND object_id = OBJECT_ID(N'dbo.ProductVariants'))
    CREATE INDEX IX_ProductVariants_ColorId ON dbo.ProductVariants (ColorId, ProductId) WHERE ColorId IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProductVariants_SizeId' AND object_id = OBJECT_ID(N'dbo.ProductVariants'))
    CREATE INDEX IX_ProductVariants_SizeId ON dbo.ProductVariants (SizeId, ProductId) WHERE SizeId IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProductImages_ProductId' AND object_id = OBJECT_ID(N'dbo.ProductImages'))
    CREATE INDEX IX_ProductImages_ProductId ON dbo.ProductImages (ProductId, DisplayOrder);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProductAttributeValues_AttributeId' AND object_id = OBJECT_ID(N'dbo.ProductAttributeValues'))
    CREATE INDEX IX_ProductAttributeValues_AttributeId ON dbo.ProductAttributeValues (ProductAttributeId, ProductId) INCLUDE (AttributeValue);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SaleProducts_ProductId' AND object_id = OBJECT_ID(N'dbo.SaleProducts'))
    CREATE INDEX IX_SaleProducts_ProductId ON dbo.SaleProducts (ProductId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sales_ActiveWindow' AND object_id = OBJECT_ID(N'dbo.Sales'))
    CREATE INDEX IX_Sales_ActiveWindow ON dbo.Sales (IsActive, StartsAt, EndsAt) WHERE IsDeleted = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_InventoryTransactions_InventoryId' AND object_id = OBJECT_ID(N'dbo.InventoryTransactions'))
    CREATE INDEX IX_InventoryTransactions_InventoryId ON dbo.InventoryTransactions (InventoryId, CreatedAt);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Orders_CustomerId' AND object_id = OBJECT_ID(N'dbo.Orders'))
    CREATE INDEX IX_Orders_CustomerId ON dbo.Orders (CustomerId, PlacedAt);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_OrderItems_OrderId' AND object_id = OBJECT_ID(N'dbo.OrderItems'))
    CREATE INDEX IX_OrderItems_OrderId ON dbo.OrderItems (OrderId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_OrderItems_ProductVariantId' AND object_id = OBJECT_ID(N'dbo.OrderItems'))
    CREATE INDEX IX_OrderItems_ProductVariantId ON dbo.OrderItems (ProductVariantId) WHERE ProductVariantId IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Payments_OrderId' AND object_id = OBJECT_ID(N'dbo.Payments'))
    CREATE INDEX IX_Payments_OrderId ON dbo.Payments (OrderId, Status);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Shipments_OrderId' AND object_id = OBJECT_ID(N'dbo.Shipments'))
    CREATE INDEX IX_Shipments_OrderId ON dbo.Shipments (OrderId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AuditLogs_Entity' AND object_id = OBJECT_ID(N'dbo.AuditLogs'))
    CREATE INDEX IX_AuditLogs_Entity ON dbo.AuditLogs (EntityName, EntityId, CreatedAt);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CustomerAddresses_CustomerId' AND object_id = OBJECT_ID(N'dbo.CustomerAddresses'))
    CREATE INDEX IX_CustomerAddresses_CustomerId ON dbo.CustomerAddresses (CustomerId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CartItems_ProductVariantId' AND object_id = OBJECT_ID(N'dbo.CartItems'))
    CREATE INDEX IX_CartItems_ProductVariantId ON dbo.CartItems (ProductVariantId) INCLUDE (CartId, Quantity);
GO

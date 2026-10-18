USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID(N'dbo.Sales', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Sales
    (
        SaleId INT IDENTITY(1, 1) NOT NULL,
        Name NVARCHAR(150) NOT NULL,
        DiscountType NVARCHAR(20) NOT NULL,
        DiscountValue DECIMAL(18, 2) NOT NULL,
        StartsAt DATETIME2(0) NULL,
        EndsAt DATETIME2(0) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Sales_IsActive DEFAULT (1),
        IsDeleted BIT NOT NULL CONSTRAINT DF_Sales_IsDeleted DEFAULT (0),
        DeletedAt DATETIME2(0) NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Sales_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(0) NULL,
        CONSTRAINT PK_Sales PRIMARY KEY CLUSTERED (SaleId),
        CONSTRAINT CK_Sales_DiscountType CHECK (DiscountType IN (N'Percentage', N'FixedAmount')),
        CONSTRAINT CK_Sales_DiscountValue CHECK (
            (DiscountType = N'Percentage' AND DiscountValue >= 0 AND DiscountValue <= 100)
            OR (DiscountType = N'FixedAmount' AND DiscountValue > 0)
        ),
        CONSTRAINT CK_Sales_Window CHECK (EndsAt IS NULL OR StartsAt IS NULL OR EndsAt >= StartsAt)
    );
END
GO

IF OBJECT_ID(N'dbo.SaleProducts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SaleProducts
    (
        SaleId INT NOT NULL,
        ProductId INT NOT NULL,
        CONSTRAINT PK_SaleProducts PRIMARY KEY CLUSTERED (SaleId, ProductId),
        CONSTRAINT FK_SaleProducts_Sales FOREIGN KEY (SaleId) REFERENCES dbo.Sales (SaleId) ON DELETE CASCADE,
        CONSTRAINT FK_SaleProducts_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products (ProductId)
    );
END
GO

IF OBJECT_ID(N'dbo.Inventory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Inventory
    (
        InventoryId INT IDENTITY(1, 1) NOT NULL,
        ProductVariantId INT NOT NULL,
        QuantityOnHand INT NOT NULL CONSTRAINT DF_Inventory_OnHand DEFAULT (0),
        QuantityReserved INT NOT NULL CONSTRAINT DF_Inventory_Reserved DEFAULT (0),
        UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Inventory_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Inventory PRIMARY KEY CLUSTERED (InventoryId),
        CONSTRAINT FK_Inventory_ProductVariants FOREIGN KEY (ProductVariantId) REFERENCES dbo.ProductVariants (ProductVariantId),
        CONSTRAINT UX_Inventory_ProductVariantId UNIQUE (ProductVariantId),
        CONSTRAINT CK_Inventory_OnHand CHECK (QuantityOnHand >= 0),
        CONSTRAINT CK_Inventory_Reserved CHECK (QuantityReserved >= 0),
        CONSTRAINT CK_Inventory_ReservedNotAboveOnHand CHECK (QuantityReserved <= QuantityOnHand)
    );
END
GO

IF OBJECT_ID(N'dbo.InventoryTransactions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.InventoryTransactions
    (
        InventoryTransactionId BIGINT IDENTITY(1, 1) NOT NULL,
        InventoryId INT NOT NULL,
        TransactionType NVARCHAR(20) NOT NULL,
        QuantityChange INT NOT NULL,
        QuantityAfter INT NOT NULL,
        ReferenceType NVARCHAR(40) NULL,
        ReferenceId INT NULL,
        Notes NVARCHAR(400) NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_InventoryTransactions_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_InventoryTransactions PRIMARY KEY CLUSTERED (InventoryTransactionId),
        CONSTRAINT FK_InventoryTransactions_Inventory FOREIGN KEY (InventoryId) REFERENCES dbo.Inventory (InventoryId),
        CONSTRAINT CK_InventoryTransactions_Type CHECK (TransactionType IN (N'Receipt', N'Sale', N'Adjustment', N'Reservation', N'Release')),
        CONSTRAINT CK_InventoryTransactions_QuantityAfter CHECK (QuantityAfter >= 0)
    );
END
GO

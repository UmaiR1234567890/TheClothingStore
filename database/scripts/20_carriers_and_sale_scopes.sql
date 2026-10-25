USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Carriers lookup table for shipment fulfilment.
IF OBJECT_ID(N'dbo.Carriers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Carriers
    (
        CarrierId INT IDENTITY(1, 1) NOT NULL,
        Name NVARCHAR(80) NOT NULL,
        Code NVARCHAR(20) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Carriers_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_Carriers_SortOrder DEFAULT (0),
        CONSTRAINT PK_Carriers PRIMARY KEY CLUSTERED (CarrierId),
        CONSTRAINT UX_Carriers_Code UNIQUE (Code)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Carriers)
BEGIN
    INSERT INTO dbo.Carriers (Name, Code, SortOrder) VALUES
        (N'TCS Courier', N'TCS', 1),
        (N'Leopards Courier', N'LEOPARD', 2),
        (N'M&P Express', N'MNP', 3),
        (N'Pakistan Post', N'PKPOST', 4),
        (N'CallCourier', N'CALL', 5),
        (N'DHL', N'DHL', 6),
        (N'FedEx', N'FEDEX', 7),
        (N'Store self-delivery', N'SELF', 8);
END
GO

-- Promotion scoping: lets a sale target whole departments or categories
-- (dynamically covering every product assigned to them) in addition to
-- the explicit product links in dbo.SaleProducts.
-- A row with both ids NULL means the sale applies to the whole store.
IF OBJECT_ID(N'dbo.SaleScopes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SaleScopes
    (
        SaleScopeId INT IDENTITY(1, 1) NOT NULL,
        SaleId INT NOT NULL,
        DepartmentId INT NULL,
        CategoryId INT NULL,
        CONSTRAINT PK_SaleScopes PRIMARY KEY CLUSTERED (SaleScopeId),
        CONSTRAINT FK_SaleScopes_Sales FOREIGN KEY (SaleId) REFERENCES dbo.Sales (SaleId) ON DELETE CASCADE,
        CONSTRAINT FK_SaleScopes_Departments FOREIGN KEY (DepartmentId) REFERENCES dbo.Departments (DepartmentId),
        CONSTRAINT FK_SaleScopes_Categories FOREIGN KEY (CategoryId) REFERENCES dbo.Categories (CategoryId),
        CONSTRAINT CK_SaleScopes_Target CHECK (CategoryId IS NULL OR DepartmentId IS NULL)
    );

    CREATE INDEX IX_SaleScopes_SaleId ON dbo.SaleScopes (SaleId);
    CREATE INDEX IX_SaleScopes_CategoryId ON dbo.SaleScopes (CategoryId);
    CREATE INDEX IX_SaleScopes_DepartmentId ON dbo.SaleScopes (DepartmentId);
END
GO

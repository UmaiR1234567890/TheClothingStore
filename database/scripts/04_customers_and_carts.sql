USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID(N'dbo.Customers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Customers
    (
        CustomerId INT IDENTITY(1, 1) NOT NULL,
        IdentityUserId NVARCHAR(450) NULL,
        Email NVARCHAR(256) NOT NULL,
        FirstName NVARCHAR(80) NULL,
        LastName NVARCHAR(80) NULL,
        Phone NVARCHAR(30) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_Customers_IsDeleted DEFAULT (0),
        DeletedAt DATETIME2(0) NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Customers_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(0) NULL,
        CONSTRAINT PK_Customers PRIMARY KEY CLUSTERED (CustomerId),
        CONSTRAINT UX_Customers_Email UNIQUE (Email)
    );
END
GO

IF OBJECT_ID(N'dbo.CustomerAddresses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CustomerAddresses
    (
        CustomerAddressId INT IDENTITY(1, 1) NOT NULL,
        CustomerId INT NOT NULL,
        FullName NVARCHAR(160) NOT NULL,
        Line1 NVARCHAR(200) NOT NULL,
        Line2 NVARCHAR(200) NULL,
        City NVARCHAR(100) NOT NULL,
        Region NVARCHAR(100) NULL,
        PostalCode NVARCHAR(20) NULL,
        Country NVARCHAR(80) NOT NULL CONSTRAINT DF_CustomerAddresses_Country DEFAULT (N'Pakistan'),
        Phone NVARCHAR(30) NULL,
        IsDefaultShipping BIT NOT NULL CONSTRAINT DF_CustomerAddresses_DefaultShipping DEFAULT (0),
        IsDefaultBilling BIT NOT NULL CONSTRAINT DF_CustomerAddresses_DefaultBilling DEFAULT (0),
        IsDeleted BIT NOT NULL CONSTRAINT DF_CustomerAddresses_IsDeleted DEFAULT (0),
        DeletedAt DATETIME2(0) NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_CustomerAddresses_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_CustomerAddresses PRIMARY KEY CLUSTERED (CustomerAddressId),
        CONSTRAINT FK_CustomerAddresses_Customers FOREIGN KEY (CustomerId) REFERENCES dbo.Customers (CustomerId) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID(N'dbo.Carts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Carts
    (
        CartId INT IDENTITY(1, 1) NOT NULL,
        CustomerId INT NULL,
        GuestToken UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Carts_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Carts_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Carts PRIMARY KEY CLUSTERED (CartId),
        CONSTRAINT FK_Carts_Customers FOREIGN KEY (CustomerId) REFERENCES dbo.Customers (CustomerId) ON DELETE CASCADE,
        CONSTRAINT CK_Carts_Owner CHECK (
            (CustomerId IS NOT NULL AND GuestToken IS NULL)
            OR (CustomerId IS NULL AND GuestToken IS NOT NULL)
        )
    );
END
GO

IF OBJECT_ID(N'dbo.CartItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CartItems
    (
        CartItemId INT IDENTITY(1, 1) NOT NULL,
        CartId INT NOT NULL,
        ProductVariantId INT NOT NULL,
        Quantity INT NOT NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_CartItems_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(0) NULL,
        CONSTRAINT PK_CartItems PRIMARY KEY CLUSTERED (CartItemId),
        CONSTRAINT FK_CartItems_Carts FOREIGN KEY (CartId) REFERENCES dbo.Carts (CartId) ON DELETE CASCADE,
        CONSTRAINT FK_CartItems_ProductVariants FOREIGN KEY (ProductVariantId) REFERENCES dbo.ProductVariants (ProductVariantId),
        CONSTRAINT UX_CartItems_Cart_Variant UNIQUE (CartId, ProductVariantId),
        CONSTRAINT CK_CartItems_Quantity CHECK (Quantity > 0)
    );
END
GO

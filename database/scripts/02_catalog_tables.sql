USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID(N'dbo.Categories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categories
    (
        CategoryId INT IDENTITY(1, 1) NOT NULL,
        DepartmentId INT NOT NULL,
        ParentCategoryId INT NULL,
        Name NVARCHAR(150) NOT NULL,
        Slug NVARCHAR(160) NOT NULL,
        SortOrder INT NOT NULL CONSTRAINT DF_Categories_SortOrder DEFAULT (0),
        IsActive BIT NOT NULL CONSTRAINT DF_Categories_IsActive DEFAULT (1),
        IsDeleted BIT NOT NULL CONSTRAINT DF_Categories_IsDeleted DEFAULT (0),
        DeletedAt DATETIME2(0) NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Categories_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(0) NULL,
        CONSTRAINT PK_Categories PRIMARY KEY CLUSTERED (CategoryId),
        CONSTRAINT FK_Categories_Departments FOREIGN KEY (DepartmentId) REFERENCES dbo.Departments (DepartmentId),
        CONSTRAINT FK_Categories_Parent FOREIGN KEY (ParentCategoryId) REFERENCES dbo.Categories (CategoryId),
        CONSTRAINT CK_Categories_ParentNotSelf CHECK (ParentCategoryId IS NULL OR ParentCategoryId <> CategoryId),
        CONSTRAINT UX_Categories_Department_Slug UNIQUE (DepartmentId, Slug)
    );
END
GO

IF OBJECT_ID(N'dbo.Products', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Products
    (
        ProductId INT IDENTITY(1, 1) NOT NULL,
        Name NVARCHAR(200) NOT NULL,
        Slug NVARCHAR(220) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        Brand NVARCHAR(120) NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Products_Status DEFAULT (N'Active'),
        IsDeleted BIT NOT NULL CONSTRAINT DF_Products_IsDeleted DEFAULT (0),
        DeletedAt DATETIME2(0) NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Products_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(0) NULL,
        CONSTRAINT PK_Products PRIMARY KEY CLUSTERED (ProductId),
        CONSTRAINT UX_Products_Slug UNIQUE (Slug),
        CONSTRAINT CK_Products_Status CHECK (Status IN (N'Draft', N'Active', N'Inactive'))
    );
END
GO

IF OBJECT_ID(N'dbo.ProductDepartments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductDepartments
    (
        ProductId INT NOT NULL,
        DepartmentId INT NOT NULL,
        CONSTRAINT PK_ProductDepartments PRIMARY KEY CLUSTERED (ProductId, DepartmentId),
        CONSTRAINT FK_ProductDepartments_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products (ProductId) ON DELETE CASCADE,
        CONSTRAINT FK_ProductDepartments_Departments FOREIGN KEY (DepartmentId) REFERENCES dbo.Departments (DepartmentId)
    );
END
GO

IF OBJECT_ID(N'dbo.ProductCategories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductCategories
    (
        ProductId INT NOT NULL,
        CategoryId INT NOT NULL,
        CONSTRAINT PK_ProductCategories PRIMARY KEY CLUSTERED (ProductId, CategoryId),
        CONSTRAINT FK_ProductCategories_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products (ProductId) ON DELETE CASCADE,
        CONSTRAINT FK_ProductCategories_Categories FOREIGN KEY (CategoryId) REFERENCES dbo.Categories (CategoryId)
    );
END
GO

IF OBJECT_ID(N'dbo.ProductVariants', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductVariants
    (
        ProductVariantId INT IDENTITY(1, 1) NOT NULL,
        ProductId INT NOT NULL,
        Sku NVARCHAR(64) NOT NULL,
        ColorId INT NULL,
        SizeId INT NULL,
        VolumeMl INT NULL,
        RegularPrice DECIMAL(18, 2) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_ProductVariants_IsActive DEFAULT (1),
        IsDeleted BIT NOT NULL CONSTRAINT DF_ProductVariants_IsDeleted DEFAULT (0),
        DeletedAt DATETIME2(0) NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ProductVariants_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(0) NULL,
        VariantSignature AS (
            CONVERT(NVARCHAR(20), ProductId) + N'|' +
            ISNULL(CONVERT(NVARCHAR(20), ColorId), N'x') + N'|' +
            ISNULL(CONVERT(NVARCHAR(20), SizeId), N'x') + N'|' +
            ISNULL(CONVERT(NVARCHAR(20), VolumeMl), N'x')
        ) PERSISTED,
        CONSTRAINT PK_ProductVariants PRIMARY KEY CLUSTERED (ProductVariantId),
        CONSTRAINT FK_ProductVariants_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products (ProductId),
        CONSTRAINT FK_ProductVariants_Colors FOREIGN KEY (ColorId) REFERENCES dbo.Colors (ColorId),
        CONSTRAINT FK_ProductVariants_Sizes FOREIGN KEY (SizeId) REFERENCES dbo.Sizes (SizeId),
        CONSTRAINT UX_ProductVariants_Sku UNIQUE (Sku),
        CONSTRAINT UX_ProductVariants_Signature UNIQUE (VariantSignature),
        CONSTRAINT CK_ProductVariants_VolumeMl CHECK (VolumeMl IS NULL OR VolumeMl > 0),
        CONSTRAINT CK_ProductVariants_RegularPrice CHECK (RegularPrice >= 0)
    );
END
GO

IF OBJECT_ID(N'dbo.ProductImages', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductImages
    (
        ProductImageId INT IDENTITY(1, 1) NOT NULL,
        ProductId INT NOT NULL,
        ImageUrl NVARCHAR(500) NOT NULL,
        AltText NVARCHAR(200) NULL,
        DisplayOrder INT NOT NULL CONSTRAINT DF_ProductImages_DisplayOrder DEFAULT (0),
        IsPrimary BIT NOT NULL CONSTRAINT DF_ProductImages_IsPrimary DEFAULT (0),
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ProductImages_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_ProductImages PRIMARY KEY CLUSTERED (ProductImageId),
        CONSTRAINT FK_ProductImages_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products (ProductId) ON DELETE CASCADE,
        CONSTRAINT CK_ProductImages_DisplayOrder CHECK (DisplayOrder >= 0)
    );
END
GO

IF OBJECT_ID(N'dbo.ProductAttributeValues', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductAttributeValues
    (
        ProductAttributeValueId INT IDENTITY(1, 1) NOT NULL,
        ProductId INT NOT NULL,
        ProductAttributeId INT NOT NULL,
        AttributeValue NVARCHAR(200) NOT NULL,
        CONSTRAINT PK_ProductAttributeValues PRIMARY KEY CLUSTERED (ProductAttributeValueId),
        CONSTRAINT FK_ProductAttributeValues_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products (ProductId) ON DELETE CASCADE,
        CONSTRAINT FK_ProductAttributeValues_Attributes FOREIGN KEY (ProductAttributeId) REFERENCES dbo.ProductAttributes (ProductAttributeId),
        CONSTRAINT UX_ProductAttributeValues_Product_Attribute UNIQUE (ProductId, ProductAttributeId)
    );
END
GO

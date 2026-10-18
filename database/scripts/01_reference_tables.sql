USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID(N'dbo.Departments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Departments
    (
        DepartmentId INT IDENTITY(1, 1) NOT NULL,
        Name NVARCHAR(100) NOT NULL,
        Slug NVARCHAR(120) NOT NULL,
        SortOrder INT NOT NULL CONSTRAINT DF_Departments_SortOrder DEFAULT (0),
        IsActive BIT NOT NULL CONSTRAINT DF_Departments_IsActive DEFAULT (1),
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Departments_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(0) NULL,
        CONSTRAINT PK_Departments PRIMARY KEY CLUSTERED (DepartmentId),
        CONSTRAINT UX_Departments_Name UNIQUE (Name),
        CONSTRAINT UX_Departments_Slug UNIQUE (Slug)
    );
END
GO

IF OBJECT_ID(N'dbo.Colors', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Colors
    (
        ColorId INT IDENTITY(1, 1) NOT NULL,
        Name NVARCHAR(80) NOT NULL,
        HexCode CHAR(7) NULL,
        SortOrder INT NOT NULL CONSTRAINT DF_Colors_SortOrder DEFAULT (0),
        IsActive BIT NOT NULL CONSTRAINT DF_Colors_IsActive DEFAULT (1),
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Colors_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Colors PRIMARY KEY CLUSTERED (ColorId),
        CONSTRAINT UX_Colors_Name UNIQUE (Name),
        CONSTRAINT CK_Colors_HexCode CHECK (HexCode IS NULL OR HexCode LIKE '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]')
    );
END
GO

IF OBJECT_ID(N'dbo.Sizes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Sizes
    (
        SizeId INT IDENTITY(1, 1) NOT NULL,
        SizeType NVARCHAR(20) NOT NULL,
        Name NVARCHAR(30) NOT NULL,
        SortOrder INT NOT NULL CONSTRAINT DF_Sizes_SortOrder DEFAULT (0),
        IsActive BIT NOT NULL CONSTRAINT DF_Sizes_IsActive DEFAULT (1),
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Sizes_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Sizes PRIMARY KEY CLUSTERED (SizeId),
        CONSTRAINT UX_Sizes_Type_Name UNIQUE (SizeType, Name),
        CONSTRAINT CK_Sizes_SizeType CHECK (SizeType IN (N'Clothing', N'Footwear'))
    );
END
GO

IF OBJECT_ID(N'dbo.ProductAttributes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductAttributes
    (
        ProductAttributeId INT IDENTITY(1, 1) NOT NULL,
        Name NVARCHAR(80) NOT NULL,
        Slug NVARCHAR(80) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_ProductAttributes_IsActive DEFAULT (1),
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ProductAttributes_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_ProductAttributes PRIMARY KEY CLUSTERED (ProductAttributeId),
        CONSTRAINT UX_ProductAttributes_Name UNIQUE (Name),
        CONSTRAINT UX_ProductAttributes_Slug UNIQUE (Slug)
    );
END
GO

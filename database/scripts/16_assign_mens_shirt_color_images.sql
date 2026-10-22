USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @ImageMap TABLE
(
    ProductSlug NVARCHAR(220) NOT NULL,
    ColorName NVARCHAR(80) NOT NULL,
    ImageUrl NVARCHAR(500) NOT NULL,
    AltText NVARCHAR(200) NOT NULL,
    DisplayOrder INT NOT NULL,
    PRIMARY KEY (ProductSlug, ColorName),
    UNIQUE (ProductSlug, ImageUrl)
);

INSERT INTO @ImageMap (ProductSlug, ColorName, ImageUrl, AltText, DisplayOrder)
VALUES
    (N'mens-cotton-shirt-main-sample', N'Black', N'/images/products/shirt-1-color-1.jpg', N'Men shirt 1 - color 1', 1),
    (N'mens-cotton-shirt-main-sample', N'White', N'/images/products/shirt-1-color-2.jpg', N'Men shirt 1 - color 2', 1),
    (N'mens-cotton-shirt-main-sample', N'Navy',  N'/images/products/shirt-1-color-3.jpg', N'Men shirt 1 - color 3', 1),
    (N'mens-cotton-shirt-main-sample', N'Beige', N'/images/products/shirt-1-color-4.jpg', N'Men shirt 1 - color 4', 1),
    (N'mens-cotton-shirt-alt-sample',  N'Black', N'/images/products/shirt-2-color-1.jpg', N'Men shirt 2 - color 1', 1),
    (N'mens-cotton-shirt-alt-sample',  N'White', N'/images/products/shirt-2-color-2.jpg', N'Men shirt 2 - color 2', 1),
    (N'mens-cotton-shirt-alt-sample',  N'Navy',  N'/images/products/shirt-2-color-3.jpg', N'Men shirt 2 - color 3', 1),
    (N'mens-cotton-shirt-alt-sample',  N'Beige', N'/images/products/shirt-2-color-4.jpg', N'Men shirt 2 - color 4', 1);

DECLARE @ResolvedImages TABLE
(
    ProductId INT NOT NULL,
    ProductSlug NVARCHAR(220) NOT NULL,
    ColorId INT NOT NULL,
    ColorName NVARCHAR(80) NOT NULL,
    ImageUrl NVARCHAR(500) NOT NULL,
    AltText NVARCHAR(200) NOT NULL,
    DisplayOrder INT NOT NULL,
    PRIMARY KEY (ProductId, ColorId)
);

BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO @ResolvedImages
        (ProductId, ProductSlug, ColorId, ColorName, ImageUrl, AltText, DisplayOrder)
    SELECT
        product.ProductId,
        product.Slug,
        color.ColorId,
        color.Name,
        mapping.ImageUrl,
        mapping.AltText,
        mapping.DisplayOrder
    FROM @ImageMap AS mapping
    INNER JOIN dbo.Products AS product
        ON product.Slug = mapping.ProductSlug
       AND product.Status = N'Active'
       AND product.IsDeleted = 0
    INNER JOIN dbo.Colors AS color ON color.Name = mapping.ColorName
    WHERE EXISTS
    (
        SELECT 1
        FROM dbo.ProductVariants AS variant
        WHERE variant.ProductId = product.ProductId
          AND variant.ColorId = color.ColorId
          AND variant.IsActive = 1
          AND variant.IsDeleted = 0
    );

    IF (SELECT COUNT(*) FROM @ResolvedImages) <> 8
        THROW 51601, N'Both active shirts and all four active colors per shirt are required.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM @ResolvedImages AS mapping
        WHERE
        (
            SELECT COUNT(*)
            FROM dbo.ProductImages AS image
            WHERE image.ProductId = mapping.ProductId
              AND image.ColorId = mapping.ColorId
              AND image.ImageUrl <> mapping.ImageUrl
        ) >= 5
    )
        THROW 51602, N'A color gallery already has five other images; remove or reassign images before replacing its sample image.', 1;

    UPDATE image
    SET image.IsPrimary = 0
    FROM dbo.ProductImages AS image
    INNER JOIN @ResolvedImages AS mapping
        ON mapping.ProductId = image.ProductId
       AND mapping.ColorId = image.ColorId
    WHERE image.IsPrimary = 1;

    INSERT INTO dbo.ProductImages (ProductId, ColorId, ImageUrl, AltText, DisplayOrder, IsPrimary)
    SELECT
        mapping.ProductId,
        mapping.ColorId,
        mapping.ImageUrl,
        mapping.AltText,
        mapping.DisplayOrder,
        0
    FROM @ResolvedImages AS mapping
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductImages AS image
        WHERE image.ProductId = mapping.ProductId
          AND image.ImageUrl = mapping.ImageUrl
    );

    UPDATE image
    SET image.ColorId = mapping.ColorId,
        image.AltText = mapping.AltText,
        image.DisplayOrder = mapping.DisplayOrder,
        image.IsPrimary = 1
    FROM dbo.ProductImages AS image
    INNER JOIN @ResolvedImages AS mapping
        ON mapping.ProductId = image.ProductId
       AND mapping.ImageUrl = image.ImageUrl;

    COMMIT TRANSACTION;

    SELECT
        mapping.ProductSlug,
        mapping.ColorName,
        mapping.ImageUrl,
        image.IsPrimary,
        COUNT(*) OVER (PARTITION BY mapping.ProductId, mapping.ColorId) AS ImagesForColor
    FROM @ResolvedImages AS mapping
    INNER JOIN dbo.ProductImages AS image
        ON image.ProductId = mapping.ProductId
       AND image.ColorId = mapping.ColorId
       AND image.ImageUrl = mapping.ImageUrl
    ORDER BY mapping.ProductSlug, mapping.ColorId;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
GO

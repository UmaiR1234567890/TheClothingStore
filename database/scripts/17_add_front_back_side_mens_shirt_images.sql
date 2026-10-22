USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @ColorMap TABLE
(
    ProductSlug NVARCHAR(220) NOT NULL,
    ColorName NVARCHAR(80) NOT NULL,
    PRIMARY KEY (ProductSlug, ColorName)
);

INSERT INTO @ColorMap (ProductSlug, ColorName)
VALUES
    (N'mens-cotton-shirt-main-sample', N'Black'),
    (N'mens-cotton-shirt-main-sample', N'White'),
    (N'mens-cotton-shirt-main-sample', N'Navy'),
    (N'mens-cotton-shirt-main-sample', N'Beige'),
    (N'mens-cotton-shirt-alt-sample', N'Black'),
    (N'mens-cotton-shirt-alt-sample', N'White'),
    (N'mens-cotton-shirt-alt-sample', N'Navy'),
    (N'mens-cotton-shirt-alt-sample', N'Beige');

DECLARE @Views TABLE
(
    ViewName NVARCHAR(40) NOT NULL PRIMARY KEY,
    DisplayOrder INT NOT NULL,
    IsPrimary BIT NOT NULL,
    IsPlaceholder BIT NOT NULL
);

INSERT INTO @Views (ViewName, DisplayOrder, IsPrimary, IsPlaceholder)
VALUES
    (N'Front view', 1, 1, 0),
    (N'Back view', 2, 0, 1),
    (N'Side view', 3, 0, 1);

DECLARE @ResolvedViews TABLE
(
    ProductId INT NOT NULL,
    ProductSlug NVARCHAR(220) NOT NULL,
    ColorId INT NOT NULL,
    ColorName NVARCHAR(80) NOT NULL,
    ImageUrl NVARCHAR(500) NOT NULL,
    AltText NVARCHAR(200) NOT NULL,
    ViewName NVARCHAR(40) NOT NULL,
    DisplayOrder INT NOT NULL,
    IsPrimary BIT NOT NULL,
    IsPlaceholder BIT NOT NULL,
    PRIMARY KEY (ProductId, ColorId, ViewName)
);

BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO @ResolvedViews
        (ProductId, ProductSlug, ColorId, ColorName, ImageUrl, AltText,
         ViewName, DisplayOrder, IsPrimary, IsPlaceholder)
    SELECT
        product.ProductId,
        product.Slug,
        color.ColorId,
        color.Name,
        front.ImageUrl,
        CONCAT(product.Name, N' - ', color.Name, N' - ', viewRow.ViewName,
            CASE WHEN viewRow.IsPlaceholder = 1 THEN N' (placeholder: reuses front photo)' ELSE N'' END),
        viewRow.ViewName,
        viewRow.DisplayOrder,
        viewRow.IsPrimary,
        viewRow.IsPlaceholder
    FROM @ColorMap AS mapping
    INNER JOIN dbo.Products AS product
        ON product.Slug = mapping.ProductSlug
       AND product.Status = N'Active'
       AND product.IsDeleted = 0
    INNER JOIN dbo.Colors AS color ON color.Name = mapping.ColorName
    INNER JOIN dbo.ProductImages AS front
        ON front.ProductId = product.ProductId
       AND front.ColorId = color.ColorId
       AND front.IsPrimary = 1
    CROSS JOIN @Views AS viewRow;

    IF (SELECT COUNT(*) FROM @ResolvedViews) <> 24
        THROW 51701, N'Each active shirt must have a primary image for all four colors before adding views.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM @ColorMap AS mapping
        INNER JOIN dbo.Products AS product ON product.Slug = mapping.ProductSlug
        INNER JOIN dbo.Colors AS color ON color.Name = mapping.ColorName
        CROSS APPLY
        (
            SELECT COUNT(*) AS ExistingCount
            FROM dbo.ProductImages AS image
            WHERE image.ProductId = product.ProductId
              AND image.ColorId = color.ColorId
        ) AS currentImages
        CROSS APPLY
        (
            SELECT COUNT(*) AS MissingViews
            FROM @ResolvedViews AS viewRow
            WHERE viewRow.ProductId = product.ProductId
              AND viewRow.ColorId = color.ColorId
              AND viewRow.DisplayOrder > 1
              AND NOT EXISTS
              (
                  SELECT 1
                  FROM dbo.ProductImages AS image
                  WHERE image.ProductId = viewRow.ProductId
                    AND image.ColorId = viewRow.ColorId
                    AND image.AltText = viewRow.AltText
              )
        ) AS pendingImages
        WHERE currentImages.ExistingCount + pendingImages.MissingViews > 5
    )
        THROW 51702, N'A color gallery would exceed the five-image limit.', 1;

    UPDATE image
    SET image.AltText = viewRow.AltText,
        image.DisplayOrder = viewRow.DisplayOrder,
        image.IsPrimary = 1
    FROM dbo.ProductImages AS image
    INNER JOIN @ResolvedViews AS viewRow
        ON viewRow.ProductId = image.ProductId
       AND viewRow.ColorId = image.ColorId
       AND viewRow.ViewName = N'Front view'
       AND viewRow.ImageUrl = image.ImageUrl;

    INSERT INTO dbo.ProductImages
        (ProductId, ColorId, ImageUrl, AltText, DisplayOrder, IsPrimary)
    SELECT
        viewRow.ProductId,
        viewRow.ColorId,
        viewRow.ImageUrl,
        viewRow.AltText,
        viewRow.DisplayOrder,
        0
    FROM @ResolvedViews AS viewRow
    WHERE viewRow.IsPlaceholder = 1
      AND NOT EXISTS
      (
          SELECT 1
          FROM dbo.ProductImages AS image
          WHERE image.ProductId = viewRow.ProductId
            AND image.ColorId = viewRow.ColorId
            AND image.AltText = viewRow.AltText
      );

    COMMIT TRANSACTION;

    SELECT
        viewRow.ProductSlug,
        viewRow.ColorName,
        viewRow.ViewName,
        image.ImageUrl,
        image.AltText,
        image.DisplayOrder,
        image.IsPrimary
    FROM @ResolvedViews AS viewRow
    INNER JOIN dbo.ProductImages AS image
        ON image.ProductId = viewRow.ProductId
       AND image.ColorId = viewRow.ColorId
       AND image.AltText = viewRow.AltText
    ORDER BY viewRow.ProductSlug, viewRow.ColorId, viewRow.DisplayOrder;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
GO

USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @RequestedProducts TABLE
(
    ProductSlug NVARCHAR(220) NOT NULL PRIMARY KEY,
    SkuPrefix NVARCHAR(32) NOT NULL
);

INSERT INTO @RequestedProducts (ProductSlug, SkuPrefix)
VALUES
    (N'mens-cotton-shirt-main-sample', N'TCS-MEN-MAIN'),
    (N'mens-cotton-shirt-alt-sample', N'TCS-MEN-ALT');

DECLARE @ColorOptions TABLE
(
    ColorName NVARCHAR(80) NOT NULL PRIMARY KEY,
    SkuCode NVARCHAR(3) NOT NULL UNIQUE
);

INSERT INTO @ColorOptions (ColorName, SkuCode)
VALUES
    (N'Black', N'BLK'),
    (N'White', N'WHT'),
    (N'Navy', N'NVY'),
    (N'Beige', N'BEG');

DECLARE @SizeOptions TABLE
(
    SizeName NVARCHAR(30) NOT NULL PRIMARY KEY,
    SkuCode NVARCHAR(2) NOT NULL UNIQUE
);

INSERT INTO @SizeOptions (SizeName, SkuCode)
VALUES
    (N'S', N'S'),
    (N'M', N'M'),
    (N'L', N'L'),
    (N'XL', N'XL');

DECLARE @TargetProducts TABLE
(
    ProductId INT NOT NULL PRIMARY KEY,
    ProductSlug NVARCHAR(220) NOT NULL UNIQUE,
    SkuPrefix NVARCHAR(32) NOT NULL,
    RegularPrice DECIMAL(18, 2) NOT NULL
);

BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO @TargetProducts (ProductId, ProductSlug, SkuPrefix, RegularPrice)
    SELECT product.ProductId, product.Slug, requested.SkuPrefix, MIN(variant.RegularPrice)
    FROM @RequestedProducts AS requested
    INNER JOIN dbo.Products AS product ON product.Slug = requested.ProductSlug
    INNER JOIN dbo.ProductVariants AS variant ON variant.ProductId = product.ProductId
    WHERE product.Status = N'Active'
      AND product.IsDeleted = 0
    GROUP BY product.ProductId, product.Slug, requested.SkuPrefix;

    IF (SELECT COUNT(*) FROM @TargetProducts) <> 2
        THROW 51401, N'Expected both active shirt products. Run script 13_keep_two_mens_shirts.sql first.', 1;

    IF (SELECT COUNT(*) FROM @ColorOptions AS requested
        INNER JOIN dbo.Colors AS color ON color.Name = requested.ColorName) <> 4
        THROW 51402, N'One or more requested colors are missing from dbo.Colors.', 1;

    IF (SELECT COUNT(*) FROM @SizeOptions AS requested
        INNER JOIN dbo.Sizes AS size
            ON size.SizeType = N'Clothing' AND size.Name = requested.SizeName) <> 4
        THROW 51403, N'One or more requested clothing sizes are missing from dbo.Sizes.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM @TargetProducts AS target
        CROSS JOIN @ColorOptions AS requestedColor
        CROSS JOIN @SizeOptions AS requestedSize
        INNER JOIN dbo.Colors AS color ON color.Name = requestedColor.ColorName
        INNER JOIN dbo.Sizes AS size
            ON size.SizeType = N'Clothing' AND size.Name = requestedSize.SizeName
        INNER JOIN dbo.ProductVariants AS existingSku
            ON existingSku.Sku = CONCAT(
                target.SkuPrefix, N'-', requestedColor.SkuCode, N'-', requestedSize.SkuCode)
        WHERE existingSku.ProductId <> target.ProductId
           OR existingSku.ColorId IS NULL
           OR existingSku.ColorId <> color.ColorId
           OR existingSku.SizeId IS NULL
           OR existingSku.SizeId <> size.SizeId
           OR existingSku.VolumeMl IS NOT NULL
    )
        THROW 51404, N'A generated SKU is already assigned to a different variant.', 1;

    UPDATE variant
    SET variant.IsActive = 0,
        variant.IsDeleted = 1,
        variant.DeletedAt = COALESCE(variant.DeletedAt, SYSUTCDATETIME()),
        variant.UpdatedAt = SYSUTCDATETIME()
    FROM dbo.ProductVariants AS variant
    INNER JOIN @TargetProducts AS target ON target.ProductId = variant.ProductId
    WHERE variant.IsDeleted = 0
      AND
      (
          variant.VolumeMl IS NOT NULL
          OR NOT EXISTS
          (
              SELECT 1
              FROM @ColorOptions AS requestedColor
              INNER JOIN dbo.Colors AS color ON color.Name = requestedColor.ColorName
              WHERE color.ColorId = variant.ColorId
          )
          OR NOT EXISTS
          (
              SELECT 1
              FROM @SizeOptions AS requestedSize
              INNER JOIN dbo.Sizes AS size
                  ON size.SizeType = N'Clothing' AND size.Name = requestedSize.SizeName
              WHERE size.SizeId = variant.SizeId
          )
      );

    UPDATE variant
    SET variant.IsActive = 1,
        variant.IsDeleted = 0,
        variant.DeletedAt = NULL,
        variant.RegularPrice = target.RegularPrice,
        variant.UpdatedAt = SYSUTCDATETIME()
    FROM dbo.ProductVariants AS variant
    INNER JOIN @TargetProducts AS target ON target.ProductId = variant.ProductId
    INNER JOIN @ColorOptions AS requestedColor ON 1 = 1
    INNER JOIN dbo.Colors AS color ON color.Name = requestedColor.ColorName
    INNER JOIN @SizeOptions AS requestedSize ON 1 = 1
    INNER JOIN dbo.Sizes AS size
        ON size.SizeType = N'Clothing' AND size.Name = requestedSize.SizeName
    WHERE variant.ColorId = color.ColorId
      AND variant.SizeId = size.SizeId
      AND variant.VolumeMl IS NULL;

    INSERT INTO dbo.ProductVariants
        (ProductId, Sku, ColorId, SizeId, VolumeMl, RegularPrice)
    SELECT
        target.ProductId,
        CONCAT(target.SkuPrefix, N'-', requestedColor.SkuCode, N'-', requestedSize.SkuCode),
        color.ColorId,
        size.SizeId,
        NULL,
        target.RegularPrice
    FROM @TargetProducts AS target
    CROSS JOIN @ColorOptions AS requestedColor
    CROSS JOIN @SizeOptions AS requestedSize
    INNER JOIN dbo.Colors AS color ON color.Name = requestedColor.ColorName
    INNER JOIN dbo.Sizes AS size
        ON size.SizeType = N'Clothing' AND size.Name = requestedSize.SizeName
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductVariants AS variant
        WHERE variant.ProductId = target.ProductId
          AND variant.ColorId = color.ColorId
          AND variant.SizeId = size.SizeId
          AND variant.VolumeMl IS NULL
    );

    INSERT INTO dbo.Inventory (ProductVariantId, QuantityOnHand, QuantityReserved)
    SELECT variant.ProductVariantId, 0, 0
    FROM @TargetProducts AS target
    INNER JOIN dbo.ProductVariants AS variant ON variant.ProductId = target.ProductId
    WHERE variant.IsActive = 1
      AND variant.IsDeleted = 0
      AND NOT EXISTS
      (
          SELECT 1
          FROM dbo.Inventory AS inventory
          WHERE inventory.ProductVariantId = variant.ProductVariantId
      );

    IF EXISTS
    (
        SELECT 1
        FROM @TargetProducts AS target
        WHERE (SELECT COUNT(*)
               FROM dbo.ProductVariants AS variant
               WHERE variant.ProductId = target.ProductId
                 AND variant.IsActive = 1
                 AND variant.IsDeleted = 0) <> 16
           OR (SELECT COUNT(*)
               FROM dbo.ProductVariants AS variant
               INNER JOIN dbo.Inventory AS inventory
                   ON inventory.ProductVariantId = variant.ProductVariantId
               WHERE variant.ProductId = target.ProductId
                 AND variant.IsActive = 1
                 AND variant.IsDeleted = 0) <> 16
    )
        THROW 51405, N'Expected 16 active, inventoried variants for each shirt.', 1;

    COMMIT TRANSACTION;

    SELECT
        product.Slug,
        product.Name AS Product,
        color.Name AS Color,
        size.Name AS Size,
        variant.Sku,
        variant.RegularPrice,
        inventory.QuantityOnHand,
        inventory.QuantityReserved,
        inventory.QuantityOnHand - inventory.QuantityReserved AS QuantityAvailable,
        image.ImageUrl
    FROM @TargetProducts AS target
    INNER JOIN dbo.Products AS product ON product.ProductId = target.ProductId
    INNER JOIN dbo.ProductVariants AS variant ON variant.ProductId = product.ProductId
    INNER JOIN dbo.Colors AS color ON color.ColorId = variant.ColorId
    INNER JOIN dbo.Sizes AS size ON size.SizeId = variant.SizeId
    INNER JOIN dbo.Inventory AS inventory ON inventory.ProductVariantId = variant.ProductVariantId
    LEFT JOIN dbo.ProductImages AS image
        ON image.ProductId = product.ProductId AND image.IsPrimary = 1
    WHERE variant.IsActive = 1
      AND variant.IsDeleted = 0
    ORDER BY product.Name, color.SortOrder, size.SortOrder;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
GO

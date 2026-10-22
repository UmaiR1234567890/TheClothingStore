USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @TargetAvailable INT = 12;
DECLARE @Changed TABLE
(
    InventoryId INT NOT NULL,
    ProductVariantId INT NOT NULL,
    QuantityChange INT NOT NULL,
    QuantityAfter INT NOT NULL
);

BEGIN TRY
    BEGIN TRANSACTION;

    IF
    (
        SELECT COUNT(*)
        FROM dbo.Products AS product
        INNER JOIN dbo.ProductVariants AS variant ON variant.ProductId = product.ProductId
        WHERE product.Slug IN (N'mens-cotton-shirt-main-sample', N'mens-cotton-shirt-alt-sample')
          AND product.Status = N'Active'
          AND product.IsDeleted = 0
          AND variant.IsActive = 1
          AND variant.IsDeleted = 0
    ) <> 32
        THROW 51801, N'Expected exactly 32 active variants across the two sample shirts.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.Products AS product
        INNER JOIN dbo.ProductVariants AS variant ON variant.ProductId = product.ProductId
        LEFT JOIN dbo.Inventory AS inventory ON inventory.ProductVariantId = variant.ProductVariantId
        WHERE product.Slug IN (N'mens-cotton-shirt-main-sample', N'mens-cotton-shirt-alt-sample')
          AND product.Status = N'Active'
          AND product.IsDeleted = 0
          AND variant.IsActive = 1
          AND variant.IsDeleted = 0
          AND inventory.InventoryId IS NULL
    )
        THROW 51802, N'Every active shirt variant must have an inventory row before adding test stock.', 1;

    UPDATE inventory
    SET QuantityOnHand =
            CASE
                WHEN inventory.QuantityOnHand - inventory.QuantityReserved < @TargetAvailable
                    THEN inventory.QuantityReserved + @TargetAvailable
                ELSE inventory.QuantityOnHand
            END,
        UpdatedAt = SYSUTCDATETIME()
    OUTPUT
        inserted.InventoryId,
        inserted.ProductVariantId,
        inserted.QuantityOnHand - deleted.QuantityOnHand,
        inserted.QuantityOnHand
    INTO @Changed (InventoryId, ProductVariantId, QuantityChange, QuantityAfter)
    FROM dbo.Inventory AS inventory
    INNER JOIN dbo.ProductVariants AS variant ON variant.ProductVariantId = inventory.ProductVariantId
    INNER JOIN dbo.Products AS product ON product.ProductId = variant.ProductId
    WHERE product.Slug IN (N'mens-cotton-shirt-main-sample', N'mens-cotton-shirt-alt-sample')
      AND product.Status = N'Active'
      AND product.IsDeleted = 0
      AND variant.IsActive = 1
      AND variant.IsDeleted = 0
      AND inventory.QuantityOnHand - inventory.QuantityReserved < @TargetAvailable;

    INSERT INTO dbo.InventoryTransactions
        (InventoryId, TransactionType, QuantityChange, QuantityAfter, ReferenceType, Notes)
    SELECT
        change.InventoryId,
        N'Adjustment',
        change.QuantityChange,
        change.QuantityAfter,
        N'DevTestStock',
        N'Stock supplied for local add-to-cart testing of all shirt color/size variants.'
    FROM @Changed AS change;

    COMMIT TRANSACTION;

    SELECT
        product.Slug,
        color.Name AS Color,
        size.Name AS Size,
        variant.Sku,
        inventory.QuantityOnHand,
        inventory.QuantityReserved,
        inventory.QuantityOnHand - inventory.QuantityReserved AS QuantityAvailable
    FROM dbo.Products AS product
    INNER JOIN dbo.ProductVariants AS variant ON variant.ProductId = product.ProductId
    INNER JOIN dbo.Colors AS color ON color.ColorId = variant.ColorId
    INNER JOIN dbo.Sizes AS size ON size.SizeId = variant.SizeId
    INNER JOIN dbo.Inventory AS inventory ON inventory.ProductVariantId = variant.ProductVariantId
    WHERE product.Slug IN (N'mens-cotton-shirt-main-sample', N'mens-cotton-shirt-alt-sample')
      AND product.Status = N'Active'
      AND product.IsDeleted = 0
      AND variant.IsActive = 1
      AND variant.IsDeleted = 0
    ORDER BY product.Slug, color.SortOrder, size.SortOrder;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
GO

USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF COL_LENGTH(N'dbo.ProductImages', N'ColorId') IS NULL
        EXEC sys.sp_executesql N'ALTER TABLE dbo.ProductImages ADD ColorId INT NULL;';

    IF NOT EXISTS
    (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = N'FK_ProductImages_Colors'
          AND parent_object_id = OBJECT_ID(N'dbo.ProductImages')
    )
    BEGIN
        EXEC sys.sp_executesql N'
            ALTER TABLE dbo.ProductImages
                ADD CONSTRAINT FK_ProductImages_Colors
                FOREIGN KEY (ColorId) REFERENCES dbo.Colors (ColorId);';
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM sys.indexes
        WHERE name = N'IX_ProductImages_Product_Color_DisplayOrder'
          AND object_id = OBJECT_ID(N'dbo.ProductImages')
    )
    BEGIN
        EXEC sys.sp_executesql N'
            CREATE INDEX IX_ProductImages_Product_Color_DisplayOrder
                ON dbo.ProductImages (ProductId, ColorId, DisplayOrder);';
    END;

    EXEC sys.sp_executesql N'
        IF EXISTS
        (
            SELECT 1
            FROM dbo.ProductImages
            WHERE IsPrimary = 1
            GROUP BY ProductId, ColorId
            HAVING COUNT(*) > 1
        )
            THROW 51501, N''Multiple primary images already exist for a product/color group.'', 1;';

    IF EXISTS
    (
        SELECT 1
        FROM sys.indexes
        WHERE name = N'UX_ProductImages_Primary'
          AND object_id = OBJECT_ID(N'dbo.ProductImages')
    )
    BEGIN
        DROP INDEX UX_ProductImages_Primary ON dbo.ProductImages;
    END;

    EXEC sys.sp_executesql N'
        CREATE UNIQUE INDEX UX_ProductImages_Primary
            ON dbo.ProductImages (ProductId, ColorId)
            WHERE IsPrimary = 1;';

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
GO

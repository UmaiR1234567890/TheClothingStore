USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @MenDepartmentId INT =
        (SELECT DepartmentId FROM dbo.Departments WHERE Slug = N'men');
    DECLARE @MensShirtsCategoryId INT =
        (SELECT CategoryId FROM dbo.Categories
         WHERE DepartmentId = @MenDepartmentId AND Slug = N'shirts');
    DECLARE @WhiteColorId INT =
        (SELECT ColorId FROM dbo.Colors WHERE Name = N'White');
    DECLARE @MediumSizeId INT =
        (SELECT SizeId FROM dbo.Sizes WHERE SizeType = N'Clothing' AND Name = N'M');
    DECLARE @FabricAttributeId INT =
        (SELECT ProductAttributeId FROM dbo.ProductAttributes WHERE Slug = N'fabric');
    DECLARE @FitAttributeId INT =
        (SELECT ProductAttributeId FROM dbo.ProductAttributes WHERE Slug = N'fit');

    IF @MenDepartmentId IS NULL
        THROW 51001, N'Men department was not found. Run 08_seed_reference_data.sql first.', 1;

    IF @MensShirtsCategoryId IS NULL
        THROW 51002, N'Men Shirts category was not found. Run 08_seed_reference_data.sql first.', 1;

    IF @WhiteColorId IS NULL OR @MediumSizeId IS NULL
        THROW 51003, N'White color or Clothing size M was not found. Run 08_seed_reference_data.sql first.', 1;

    IF @FabricAttributeId IS NULL OR @FitAttributeId IS NULL
        THROW 51004, N'Fabric or Fit attribute was not found. Run 08_seed_reference_data.sql first.', 1;

    DECLARE @ProductId INT;
    DECLARE @VariantId INT;
    DECLARE @InventoryId INT;
    DECLARE @ProductSlug NVARCHAR(220) = N'mens-cotton-shirt-dml-sample';
    DECLARE @VariantSku NVARCHAR(64) = N'TCS-DML-MEN-SHIRT-WHT-M-01';
    DECLARE @OpeningQuantity INT = 12;

    IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Slug = @ProductSlug)
    BEGIN
        INSERT INTO dbo.Products (Name, Slug, Description, Brand, Status)
        VALUES
        (
            N'Men Cotton Shirt - Sample',
            @ProductSlug,
            N'Fictional sample product for the Men Shirts catalog.',
            N'The Clothing Store',
            N'Active'
        );
    END;

    SELECT @ProductId = ProductId
    FROM dbo.Products
    WHERE Slug = @ProductSlug;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.ProductDepartments
        WHERE ProductId = @ProductId AND DepartmentId = @MenDepartmentId
    )
    BEGIN
        INSERT INTO dbo.ProductDepartments (ProductId, DepartmentId)
        VALUES (@ProductId, @MenDepartmentId);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.ProductCategories
        WHERE ProductId = @ProductId AND CategoryId = @MensShirtsCategoryId
    )
    BEGIN
        INSERT INTO dbo.ProductCategories (ProductId, CategoryId)
        VALUES (@ProductId, @MensShirtsCategoryId);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.ProductAttributeValues
        WHERE ProductId = @ProductId AND ProductAttributeId = @FabricAttributeId
    )
    BEGIN
        INSERT INTO dbo.ProductAttributeValues (ProductId, ProductAttributeId, AttributeValue)
        VALUES (@ProductId, @FabricAttributeId, N'Cotton');
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.ProductAttributeValues
        WHERE ProductId = @ProductId AND ProductAttributeId = @FitAttributeId
    )
    BEGIN
        INSERT INTO dbo.ProductAttributeValues (ProductId, ProductAttributeId, AttributeValue)
        VALUES (@ProductId, @FitAttributeId, N'Regular');
    END;

    SELECT @VariantId = ProductVariantId
    FROM dbo.ProductVariants
    WHERE ProductId = @ProductId
      AND ColorId = @WhiteColorId
      AND SizeId = @MediumSizeId
      AND VolumeMl IS NULL;

    IF @VariantId IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE Sku = @VariantSku)
            THROW 51005, N'The sample SKU is already assigned to a different variant.', 1;

        INSERT INTO dbo.ProductVariants (ProductId, Sku, ColorId, SizeId, VolumeMl, RegularPrice)
        VALUES (@ProductId, @VariantSku, @WhiteColorId, @MediumSizeId, NULL, 3490.00);

        SET @VariantId = CONVERT(INT, SCOPE_IDENTITY());
    END;

    SELECT @InventoryId = InventoryId
    FROM dbo.Inventory
    WHERE ProductVariantId = @VariantId;

    IF @InventoryId IS NULL
    BEGIN
        INSERT INTO dbo.Inventory (ProductVariantId, QuantityOnHand, QuantityReserved)
        VALUES (@VariantId, @OpeningQuantity, 0);

        SET @InventoryId = CONVERT(INT, SCOPE_IDENTITY());

        INSERT INTO dbo.InventoryTransactions
            (InventoryId, TransactionType, QuantityChange, QuantityAfter, ReferenceType, Notes)
        VALUES
            (@InventoryId, N'Receipt', @OpeningQuantity, @OpeningQuantity, N'Seed',
             N'Opening stock for Men Cotton Shirt sample.');
    END;

    COMMIT TRANSACTION;

    SELECT
        d.Name AS Department,
        c.Name AS Category,
        p.ProductId,
        p.Name AS Product,
        p.Slug,
        pv.ProductVariantId,
        pv.Sku,
        pv.RegularPrice,
        i.QuantityOnHand,
        i.QuantityReserved,
        i.QuantityOnHand - i.QuantityReserved AS QuantityAvailable
    FROM dbo.Products AS p
    INNER JOIN dbo.ProductDepartments AS pd ON pd.ProductId = p.ProductId
    INNER JOIN dbo.Departments AS d ON d.DepartmentId = pd.DepartmentId
    INNER JOIN dbo.ProductCategories AS pc ON pc.ProductId = p.ProductId
    INNER JOIN dbo.Categories AS c ON c.CategoryId = pc.CategoryId
    INNER JOIN dbo.ProductVariants AS pv ON pv.ProductId = p.ProductId
    INNER JOIN dbo.Inventory AS i ON i.ProductVariantId = pv.ProductVariantId
    WHERE p.ProductId = @ProductId
      AND pv.ProductVariantId = @VariantId;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
GO

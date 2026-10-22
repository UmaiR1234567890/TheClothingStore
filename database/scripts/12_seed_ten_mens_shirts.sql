USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Shirts TABLE
(
    ProductSlug NVARCHAR(220) NOT NULL PRIMARY KEY,
    ProductName NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500) NOT NULL,
    Sku NVARCHAR(64) NOT NULL UNIQUE,
    ColorName NVARCHAR(80) NOT NULL,
    SizeName NVARCHAR(30) NOT NULL,
    RegularPrice DECIMAL(18, 2) NOT NULL,
    Fabric NVARCHAR(200) NOT NULL,
    Fit NVARCHAR(200) NOT NULL
);

INSERT INTO @Shirts
    (ProductSlug, ProductName, Description, Sku, ColorName, SizeName, RegularPrice, Fabric, Fit)
VALUES
    (N'mens-shirt-sample-01', N'Men Classic Cotton Shirt - Sample 01', N'Fictional catalog sample shirt.', N'TCS-MEN-SHIRT-SAMPLE-01', N'Black',  N'M', 3490.00, N'Cotton',           N'Regular'),
    (N'mens-shirt-sample-02', N'Men Poplin Shirt - Sample 02',         N'Fictional catalog sample shirt.', N'TCS-MEN-SHIRT-SAMPLE-02', N'White',  N'M', 3690.00, N'Cotton Poplin',    N'Slim'),
    (N'mens-shirt-sample-03', N'Men Linen Blend Shirt - Sample 03',    N'Fictional catalog sample shirt.', N'TCS-MEN-SHIRT-SAMPLE-03', N'Navy',   N'L', 4290.00, N'Linen Blend',      N'Relaxed'),
    (N'mens-shirt-sample-04', N'Men Textured Shirt - Sample 04',       N'Fictional catalog sample shirt.', N'TCS-MEN-SHIRT-SAMPLE-04', N'Beige',  N'S', 3890.00, N'Textured Cotton',  N'Regular'),
    (N'mens-shirt-sample-05', N'Men Maroon Casual Shirt - Sample 05',  N'Fictional catalog sample shirt.', N'TCS-MEN-SHIRT-SAMPLE-05', N'Maroon', N'M', 3590.00, N'Cotton Blend',     N'Regular'),
    (N'mens-shirt-sample-06', N'Men Black Oxford Shirt - Sample 06',   N'Fictional catalog sample shirt.', N'TCS-MEN-SHIRT-SAMPLE-06', N'Black',  N'L', 4190.00, N'Cotton',           N'Slim'),
    (N'mens-shirt-sample-07', N'Men White Formal Shirt - Sample 07',   N'Fictional catalog sample shirt.', N'TCS-MEN-SHIRT-SAMPLE-07', N'White',  N'XL',3990.00, N'Cotton Poplin',    N'Regular'),
    (N'mens-shirt-sample-08', N'Men Navy Chambray Shirt - Sample 08',  N'Fictional catalog sample shirt.', N'TCS-MEN-SHIRT-SAMPLE-08', N'Navy',   N'M', 4390.00, N'Chambray Cotton',  N'Relaxed'),
    (N'mens-shirt-sample-09', N'Men Beige Casual Shirt - Sample 09',   N'Fictional catalog sample shirt.', N'TCS-MEN-SHIRT-SAMPLE-09', N'Beige',  N'XL',3790.00, N'Cotton Blend',     N'Regular'),
    (N'mens-shirt-sample-10', N'Men Maroon Flannel Shirt - Sample 10', N'Fictional catalog sample shirt.', N'TCS-MEN-SHIRT-SAMPLE-10', N'Maroon', N'L', 4590.00, N'Cotton Flannel',   N'Relaxed');

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @MenDepartmentId INT =
        (SELECT DepartmentId FROM dbo.Departments WHERE Slug = N'men');
    DECLARE @MensShirtsCategoryId INT =
        (SELECT CategoryId
         FROM dbo.Categories
         WHERE DepartmentId = @MenDepartmentId AND Slug = N'shirts');
    DECLARE @FabricAttributeId INT =
        (SELECT ProductAttributeId FROM dbo.ProductAttributes WHERE Slug = N'fabric');
    DECLARE @FitAttributeId INT =
        (SELECT ProductAttributeId FROM dbo.ProductAttributes WHERE Slug = N'fit');

    IF @MenDepartmentId IS NULL
        THROW 51101, N'Men department was not found. Run 08_seed_reference_data.sql first.', 1;

    IF @MensShirtsCategoryId IS NULL
        THROW 51102, N'Men Shirts category was not found. Run 08_seed_reference_data.sql first.', 1;

    IF @FabricAttributeId IS NULL OR @FitAttributeId IS NULL
        THROW 51103, N'Fabric or Fit attribute was not found. Run 08_seed_reference_data.sql first.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM @Shirts AS sample
        LEFT JOIN dbo.Colors AS color ON color.Name = sample.ColorName
        LEFT JOIN dbo.Sizes AS size
            ON size.SizeType = N'Clothing' AND size.Name = sample.SizeName
        WHERE color.ColorId IS NULL OR size.SizeId IS NULL
    )
        THROW 51104, N'A sample color or clothing size was not found. Run 08_seed_reference_data.sql first.', 1;

    INSERT INTO dbo.Products (Name, Slug, Description, Brand, Status)
    SELECT sample.ProductName, sample.ProductSlug, sample.Description, N'The Clothing Store', N'Active'
    FROM @Shirts AS sample
    WHERE NOT EXISTS
    (
        SELECT 1 FROM dbo.Products AS product WHERE product.Slug = sample.ProductSlug
    );

    IF EXISTS
    (
        SELECT 1
        FROM @Shirts AS sample
        INNER JOIN dbo.Products AS product ON product.Slug = sample.ProductSlug
        INNER JOIN dbo.Colors AS color ON color.Name = sample.ColorName
        INNER JOIN dbo.Sizes AS size
            ON size.SizeType = N'Clothing' AND size.Name = sample.SizeName
        INNER JOIN dbo.ProductVariants AS variant ON variant.Sku = sample.Sku
        WHERE variant.ProductId <> product.ProductId
           OR variant.ColorId IS NULL
           OR variant.ColorId <> color.ColorId
           OR variant.SizeId IS NULL
           OR variant.SizeId <> size.SizeId
           OR variant.VolumeMl IS NOT NULL
    )
        THROW 51105, N'A sample SKU is already assigned to a different variant.', 1;

    INSERT INTO dbo.ProductDepartments (ProductId, DepartmentId)
    SELECT product.ProductId, @MenDepartmentId
    FROM @Shirts AS sample
    INNER JOIN dbo.Products AS product ON product.Slug = sample.ProductSlug
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductDepartments AS map
        WHERE map.ProductId = product.ProductId AND map.DepartmentId = @MenDepartmentId
    );

    INSERT INTO dbo.ProductCategories (ProductId, CategoryId)
    SELECT product.ProductId, @MensShirtsCategoryId
    FROM @Shirts AS sample
    INNER JOIN dbo.Products AS product ON product.Slug = sample.ProductSlug
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductCategories AS map
        WHERE map.ProductId = product.ProductId AND map.CategoryId = @MensShirtsCategoryId
    );

    INSERT INTO dbo.ProductAttributeValues (ProductId, ProductAttributeId, AttributeValue)
    SELECT product.ProductId, @FabricAttributeId, sample.Fabric
    FROM @Shirts AS sample
    INNER JOIN dbo.Products AS product ON product.Slug = sample.ProductSlug
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductAttributeValues AS value
        WHERE value.ProductId = product.ProductId
          AND value.ProductAttributeId = @FabricAttributeId
    );

    INSERT INTO dbo.ProductAttributeValues (ProductId, ProductAttributeId, AttributeValue)
    SELECT product.ProductId, @FitAttributeId, sample.Fit
    FROM @Shirts AS sample
    INNER JOIN dbo.Products AS product ON product.Slug = sample.ProductSlug
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductAttributeValues AS value
        WHERE value.ProductId = product.ProductId
          AND value.ProductAttributeId = @FitAttributeId
    );

    INSERT INTO dbo.ProductVariants
        (ProductId, Sku, ColorId, SizeId, VolumeMl, RegularPrice)
    SELECT product.ProductId, sample.Sku, color.ColorId, size.SizeId, NULL, sample.RegularPrice
    FROM @Shirts AS sample
    INNER JOIN dbo.Products AS product ON product.Slug = sample.ProductSlug
    INNER JOIN dbo.Colors AS color ON color.Name = sample.ColorName
    INNER JOIN dbo.Sizes AS size
        ON size.SizeType = N'Clothing' AND size.Name = sample.SizeName
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductVariants AS variant
        WHERE variant.ProductId = product.ProductId
          AND variant.ColorId = color.ColorId
          AND variant.SizeId = size.SizeId
          AND variant.VolumeMl IS NULL
    );

    DECLARE @NewInventory TABLE
    (
        InventoryId INT NOT NULL,
        ProductVariantId INT NOT NULL,
        QuantityOnHand INT NOT NULL
    );

    INSERT INTO dbo.Inventory (ProductVariantId, QuantityOnHand, QuantityReserved)
    OUTPUT inserted.InventoryId, inserted.ProductVariantId, inserted.QuantityOnHand
        INTO @NewInventory (InventoryId, ProductVariantId, QuantityOnHand)
    SELECT variant.ProductVariantId, 12, 0
    FROM @Shirts AS sample
    INNER JOIN dbo.Products AS product ON product.Slug = sample.ProductSlug
    INNER JOIN dbo.Colors AS color ON color.Name = sample.ColorName
    INNER JOIN dbo.Sizes AS size
        ON size.SizeType = N'Clothing' AND size.Name = sample.SizeName
    INNER JOIN dbo.ProductVariants AS variant
        ON variant.ProductId = product.ProductId
       AND variant.ColorId = color.ColorId
       AND variant.SizeId = size.SizeId
       AND variant.VolumeMl IS NULL
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.Inventory AS inventory
        WHERE inventory.ProductVariantId = variant.ProductVariantId
    );

    INSERT INTO dbo.InventoryTransactions
        (InventoryId, TransactionType, QuantityChange, QuantityAfter, ReferenceType, Notes)
    SELECT
        inventory.InventoryId,
        N'Receipt',
        inventory.QuantityOnHand,
        inventory.QuantityOnHand,
        N'Seed',
        CONCAT(N'Opening stock for sample shirt SKU ', variant.Sku, N'.')
    FROM @NewInventory AS inventory
    INNER JOIN dbo.ProductVariants AS variant
        ON variant.ProductVariantId = inventory.ProductVariantId;

    COMMIT TRANSACTION;

    SELECT
        department.Name AS Department,
        category.Name AS Category,
        product.ProductId,
        product.Name AS Product,
        product.Slug,
        variant.ProductVariantId,
        variant.Sku,
        color.Name AS Color,
        size.Name AS Size,
        variant.RegularPrice,
        inventory.QuantityOnHand,
        inventory.QuantityReserved,
        inventory.QuantityOnHand - inventory.QuantityReserved AS QuantityAvailable
    FROM @Shirts AS sample
    INNER JOIN dbo.Products AS product ON product.Slug = sample.ProductSlug
    INNER JOIN dbo.ProductDepartments AS productDepartment
        ON productDepartment.ProductId = product.ProductId
    INNER JOIN dbo.Departments AS department
        ON department.DepartmentId = productDepartment.DepartmentId
    INNER JOIN dbo.ProductCategories AS productCategory
        ON productCategory.ProductId = product.ProductId
    INNER JOIN dbo.Categories AS category
        ON category.CategoryId = productCategory.CategoryId
    INNER JOIN dbo.Colors AS color ON color.Name = sample.ColorName
    INNER JOIN dbo.Sizes AS size
        ON size.SizeType = N'Clothing' AND size.Name = sample.SizeName
    INNER JOIN dbo.ProductVariants AS variant
        ON variant.ProductId = product.ProductId
       AND variant.ColorId = color.ColorId
       AND variant.SizeId = size.SizeId
       AND variant.VolumeMl IS NULL
    INNER JOIN dbo.Inventory AS inventory
        ON inventory.ProductVariantId = variant.ProductVariantId
    WHERE department.DepartmentId = @MenDepartmentId
      AND category.CategoryId = @MensShirtsCategoryId
    ORDER BY product.Name;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
GO

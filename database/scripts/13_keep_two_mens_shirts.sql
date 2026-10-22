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
    ImageUrl NVARCHAR(500) NOT NULL,
    AltText NVARCHAR(200) NOT NULL
);

INSERT INTO @Shirts
    (ProductSlug, ProductName, Description, Sku, ColorName, SizeName, RegularPrice, ImageUrl, AltText)
VALUES
    (N'mens-cotton-shirt-main-sample',
     N'Men Cotton Casual Shirt Sample 1',
     N'Fictional sample product for the Men Shirts catalog.',
     N'TCS-MEN-SHIRT-MAIN-001',
     N'White', N'M', 3490.00,
     N'/images/products/men-cotton-casual-shirt-main.jpg',
     N'Men cotton casual shirt sample 1'),
    (N'mens-cotton-shirt-alt-sample',
     N'Men Cotton Casual Shirt Sample 2',
     N'Fictional sample product for the Men Shirts catalog.',
     N'TCS-MEN-SHIRT-ALT-001',
     N'Black', N'M', 3490.00,
     N'/images/products/men-cotton-casual-shirt-alt.jpg',
     N'Men cotton casual shirt sample 2');

DECLARE @OldMensShirts TABLE (ProductId INT NOT NULL PRIMARY KEY);
DECLARE @NewInventory TABLE
(
    InventoryId INT NOT NULL,
    ProductVariantId INT NOT NULL,
    QuantityOnHand INT NOT NULL
);

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
        THROW 51301, N'Men department was not found. Run 08_seed_reference_data.sql first.', 1;

    IF @MensShirtsCategoryId IS NULL
        THROW 51302, N'Men Shirts category was not found. Run 08_seed_reference_data.sql first.', 1;

    IF @FabricAttributeId IS NULL OR @FitAttributeId IS NULL
        THROW 51303, N'Fabric or Fit attribute was not found. Run 08_seed_reference_data.sql first.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM @Shirts AS sample
        LEFT JOIN dbo.Colors AS color ON color.Name = sample.ColorName
        LEFT JOIN dbo.Sizes AS size
            ON size.SizeType = N'Clothing' AND size.Name = sample.SizeName
        WHERE color.ColorId IS NULL OR size.SizeId IS NULL
    )
        THROW 51304, N'A sample color or clothing size was not found. Run 08_seed_reference_data.sql first.', 1;

    ;WITH MensShirtCategories AS
    (
        SELECT CategoryId
        FROM dbo.Categories
        WHERE DepartmentId = @MenDepartmentId AND Slug = N'shirts'

        UNION ALL

        SELECT child.CategoryId
        FROM dbo.Categories AS child
        INNER JOIN MensShirtCategories AS parent
            ON parent.CategoryId = child.ParentCategoryId
        WHERE child.DepartmentId = @MenDepartmentId
    )
    INSERT INTO @OldMensShirts (ProductId)
    SELECT DISTINCT product.ProductId
    FROM dbo.Products AS product
    INNER JOIN dbo.ProductDepartments AS productDepartment
        ON productDepartment.ProductId = product.ProductId
       AND productDepartment.DepartmentId = @MenDepartmentId
    INNER JOIN dbo.ProductCategories AS productCategory
        ON productCategory.ProductId = product.ProductId
    INNER JOIN MensShirtCategories AS shirtCategory
        ON shirtCategory.CategoryId = productCategory.CategoryId
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM @Shirts AS keepProduct
        WHERE keepProduct.ProductSlug = product.Slug
    )
    OPTION (MAXRECURSION 100);

    UPDATE product
    SET product.Status = N'Inactive',
        product.IsDeleted = 1,
        product.DeletedAt = COALESCE(product.DeletedAt, SYSUTCDATETIME()),
        product.UpdatedAt = SYSUTCDATETIME()
    FROM dbo.Products AS product
    INNER JOIN @OldMensShirts AS oldProduct ON oldProduct.ProductId = product.ProductId
    WHERE product.IsDeleted = 0 OR product.Status <> N'Inactive';

    UPDATE variant
    SET variant.IsActive = 0,
        variant.IsDeleted = 1,
        variant.DeletedAt = COALESCE(variant.DeletedAt, SYSUTCDATETIME()),
        variant.UpdatedAt = SYSUTCDATETIME()
    FROM dbo.ProductVariants AS variant
    INNER JOIN @OldMensShirts AS oldProduct ON oldProduct.ProductId = variant.ProductId
    WHERE variant.IsDeleted = 0 OR variant.IsActive = 1;

    INSERT INTO dbo.Products (Name, Slug, Description, Brand, Status)
    SELECT sample.ProductName, sample.ProductSlug, sample.Description, N'The Clothing Store', N'Active'
    FROM @Shirts AS sample
    WHERE NOT EXISTS
    (
        SELECT 1 FROM dbo.Products AS product WHERE product.Slug = sample.ProductSlug
    );

    UPDATE product
    SET product.Name = sample.ProductName,
        product.Description = sample.Description,
        product.Brand = N'The Clothing Store',
        product.Status = N'Active',
        product.IsDeleted = 0,
        product.DeletedAt = NULL,
        product.UpdatedAt = SYSUTCDATETIME()
    FROM dbo.Products AS product
    INNER JOIN @Shirts AS sample ON sample.ProductSlug = product.Slug;

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
        THROW 51305, N'A target SKU is already assigned to a different variant.', 1;

    INSERT INTO dbo.ProductDepartments (ProductId, DepartmentId)
    SELECT product.ProductId, @MenDepartmentId
    FROM @Shirts AS sample
    INNER JOIN dbo.Products AS product ON product.Slug = sample.ProductSlug
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductDepartments AS map
        WHERE map.ProductId = product.ProductId
          AND map.DepartmentId = @MenDepartmentId
    );

    INSERT INTO dbo.ProductCategories (ProductId, CategoryId)
    SELECT product.ProductId, @MensShirtsCategoryId
    FROM @Shirts AS sample
    INNER JOIN dbo.Products AS product ON product.Slug = sample.ProductSlug
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductCategories AS map
        WHERE map.ProductId = product.ProductId
          AND map.CategoryId = @MensShirtsCategoryId
    );

    INSERT INTO dbo.ProductAttributeValues (ProductId, ProductAttributeId, AttributeValue)
    SELECT product.ProductId, @FabricAttributeId, N'Cotton'
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
    SELECT product.ProductId, @FitAttributeId, N'Regular'
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

    UPDATE variant
    SET variant.IsActive = 1,
        variant.IsDeleted = 0,
        variant.DeletedAt = NULL,
        variant.RegularPrice = sample.RegularPrice,
        variant.UpdatedAt = SYSUTCDATETIME()
    FROM dbo.ProductVariants AS variant
    INNER JOIN dbo.Products AS product ON product.ProductId = variant.ProductId
    INNER JOIN @Shirts AS sample ON sample.ProductSlug = product.Slug
    INNER JOIN dbo.Colors AS color ON color.Name = sample.ColorName
    INNER JOIN dbo.Sizes AS size
        ON size.SizeType = N'Clothing' AND size.Name = sample.SizeName
    WHERE variant.ColorId = color.ColorId
      AND variant.SizeId = size.SizeId
      AND variant.VolumeMl IS NULL;

    INSERT INTO dbo.ProductImages (ProductId, ImageUrl, AltText, DisplayOrder, IsPrimary)
    SELECT product.ProductId, sample.ImageUrl, sample.AltText, 1, 0
    FROM @Shirts AS sample
    INNER JOIN dbo.Products AS product ON product.Slug = sample.ProductSlug
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.ProductImages AS image
        WHERE image.ProductId = product.ProductId
          AND image.ImageUrl = sample.ImageUrl
    );

    UPDATE image
    SET image.IsPrimary = 0
    FROM dbo.ProductImages AS image
    INNER JOIN dbo.Products AS product ON product.ProductId = image.ProductId
    INNER JOIN @Shirts AS sample ON sample.ProductSlug = product.Slug;

    UPDATE image
    SET image.IsPrimary = 1,
        image.AltText = sample.AltText,
        image.DisplayOrder = 1
    FROM dbo.ProductImages AS image
    INNER JOIN dbo.Products AS product ON product.ProductId = image.ProductId
    INNER JOIN @Shirts AS sample
        ON sample.ProductSlug = product.Slug
       AND sample.ImageUrl = image.ImageUrl;

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
       AND variant.IsDeleted = 0
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

    DECLARE @ActiveMensShirtCount INT;

    ;WITH MensShirtCategories AS
    (
        SELECT CategoryId
        FROM dbo.Categories
        WHERE DepartmentId = @MenDepartmentId AND Slug = N'shirts'

        UNION ALL

        SELECT child.CategoryId
        FROM dbo.Categories AS child
        INNER JOIN MensShirtCategories AS parent
            ON parent.CategoryId = child.ParentCategoryId
        WHERE child.DepartmentId = @MenDepartmentId
    )
    SELECT @ActiveMensShirtCount = COUNT(DISTINCT product.ProductId)
    FROM dbo.Products AS product
    INNER JOIN dbo.ProductDepartments AS productDepartment
        ON productDepartment.ProductId = product.ProductId
       AND productDepartment.DepartmentId = @MenDepartmentId
    INNER JOIN dbo.ProductCategories AS productCategory
        ON productCategory.ProductId = product.ProductId
    INNER JOIN MensShirtCategories AS shirtCategory
        ON shirtCategory.CategoryId = productCategory.CategoryId
    WHERE product.Status = N'Active'
      AND product.IsDeleted = 0
      AND EXISTS
      (
          SELECT 1
          FROM dbo.ProductVariants AS variant
          INNER JOIN dbo.Inventory AS inventory
              ON inventory.ProductVariantId = variant.ProductVariantId
          WHERE variant.ProductId = product.ProductId
            AND variant.IsActive = 1
            AND variant.IsDeleted = 0
            AND inventory.QuantityOnHand > inventory.QuantityReserved
      )
    OPTION (MAXRECURSION 100);

    IF @ActiveMensShirtCount <> 2
        THROW 51306, N'Expected exactly two active, in-stock products in Men Shirts.', 1;

    COMMIT TRANSACTION;

    SELECT
        product.ProductId,
        product.Name AS Product,
        product.Slug,
        image.ImageUrl,
        variant.Sku,
        color.Name AS Color,
        size.Name AS Size,
        variant.RegularPrice,
        inventory.QuantityOnHand,
        inventory.QuantityReserved,
        inventory.QuantityOnHand - inventory.QuantityReserved AS QuantityAvailable
    FROM @Shirts AS sample
    INNER JOIN dbo.Products AS product ON product.Slug = sample.ProductSlug
    INNER JOIN dbo.ProductImages AS image
        ON image.ProductId = product.ProductId
       AND image.ImageUrl = sample.ImageUrl
       AND image.IsPrimary = 1
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
    ORDER BY product.Name;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
GO

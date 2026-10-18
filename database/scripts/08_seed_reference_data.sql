USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

SET NOCOUNT ON;

/* Departments */
IF NOT EXISTS (SELECT 1 FROM dbo.Departments WHERE Slug = N'men')
    INSERT INTO dbo.Departments (Name, Slug, SortOrder) VALUES (N'Men', N'men', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Departments WHERE Slug = N'women')
    INSERT INTO dbo.Departments (Name, Slug, SortOrder) VALUES (N'Women', N'women', 2);
IF NOT EXISTS (SELECT 1 FROM dbo.Departments WHERE Slug = N'kids')
    INSERT INTO dbo.Departments (Name, Slug, SortOrder) VALUES (N'Kids', N'kids', 3);

DECLARE @Men INT = (SELECT DepartmentId FROM dbo.Departments WHERE Slug = N'men');
DECLARE @Women INT = (SELECT DepartmentId FROM dbo.Departments WHERE Slug = N'women');
DECLARE @Kids INT = (SELECT DepartmentId FROM dbo.Departments WHERE Slug = N'kids');

/* Colors */
IF NOT EXISTS (SELECT 1 FROM dbo.Colors WHERE Name = N'Black')
    INSERT INTO dbo.Colors (Name, HexCode, SortOrder) VALUES (N'Black', N'#000000', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Colors WHERE Name = N'White')
    INSERT INTO dbo.Colors (Name, HexCode, SortOrder) VALUES (N'White', N'#FFFFFF', 2);
IF NOT EXISTS (SELECT 1 FROM dbo.Colors WHERE Name = N'Navy')
    INSERT INTO dbo.Colors (Name, HexCode, SortOrder) VALUES (N'Navy', N'#001F3F', 3);
IF NOT EXISTS (SELECT 1 FROM dbo.Colors WHERE Name = N'Beige')
    INSERT INTO dbo.Colors (Name, HexCode, SortOrder) VALUES (N'Beige', N'#F5F5DC', 4);
IF NOT EXISTS (SELECT 1 FROM dbo.Colors WHERE Name = N'Maroon')
    INSERT INTO dbo.Colors (Name, HexCode, SortOrder) VALUES (N'Maroon', N'#800000', 5);

/* Clothing sizes */
IF NOT EXISTS (SELECT 1 FROM dbo.Sizes WHERE SizeType = N'Clothing' AND Name = N'XS')
    INSERT INTO dbo.Sizes (SizeType, Name, SortOrder) VALUES (N'Clothing', N'XS', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Sizes WHERE SizeType = N'Clothing' AND Name = N'S')
    INSERT INTO dbo.Sizes (SizeType, Name, SortOrder) VALUES (N'Clothing', N'S', 2);
IF NOT EXISTS (SELECT 1 FROM dbo.Sizes WHERE SizeType = N'Clothing' AND Name = N'M')
    INSERT INTO dbo.Sizes (SizeType, Name, SortOrder) VALUES (N'Clothing', N'M', 3);
IF NOT EXISTS (SELECT 1 FROM dbo.Sizes WHERE SizeType = N'Clothing' AND Name = N'L')
    INSERT INTO dbo.Sizes (SizeType, Name, SortOrder) VALUES (N'Clothing', N'L', 4);
IF NOT EXISTS (SELECT 1 FROM dbo.Sizes WHERE SizeType = N'Clothing' AND Name = N'XL')
    INSERT INTO dbo.Sizes (SizeType, Name, SortOrder) VALUES (N'Clothing', N'XL', 5);

/* Footwear sizes */
IF NOT EXISTS (SELECT 1 FROM dbo.Sizes WHERE SizeType = N'Footwear' AND Name = N'40')
    INSERT INTO dbo.Sizes (SizeType, Name, SortOrder) VALUES (N'Footwear', N'40', 10);
IF NOT EXISTS (SELECT 1 FROM dbo.Sizes WHERE SizeType = N'Footwear' AND Name = N'41')
    INSERT INTO dbo.Sizes (SizeType, Name, SortOrder) VALUES (N'Footwear', N'41', 11);
IF NOT EXISTS (SELECT 1 FROM dbo.Sizes WHERE SizeType = N'Footwear' AND Name = N'42')
    INSERT INTO dbo.Sizes (SizeType, Name, SortOrder) VALUES (N'Footwear', N'42', 12);
IF NOT EXISTS (SELECT 1 FROM dbo.Sizes WHERE SizeType = N'Footwear' AND Name = N'43')
    INSERT INTO dbo.Sizes (SizeType, Name, SortOrder) VALUES (N'Footwear', N'43', 13);

/* Product attributes */
IF NOT EXISTS (SELECT 1 FROM dbo.ProductAttributes WHERE Slug = N'fabric')
    INSERT INTO dbo.ProductAttributes (Name, Slug) VALUES (N'Fabric', N'fabric');
IF NOT EXISTS (SELECT 1 FROM dbo.ProductAttributes WHERE Slug = N'fit')
    INSERT INTO dbo.ProductAttributes (Name, Slug) VALUES (N'Fit', N'fit');
IF NOT EXISTS (SELECT 1 FROM dbo.ProductAttributes WHERE Slug = N'sleeve-type')
    INSERT INTO dbo.ProductAttributes (Name, Slug) VALUES (N'Sleeve Type', N'sleeve-type');
IF NOT EXISTS (SELECT 1 FROM dbo.ProductAttributes WHERE Slug = N'material')
    INSERT INTO dbo.ProductAttributes (Name, Slug) VALUES (N'Material', N'material');
IF NOT EXISTS (SELECT 1 FROM dbo.ProductAttributes WHERE Slug = N'fragrance-family')
    INSERT INTO dbo.ProductAttributes (Name, Slug) VALUES (N'Fragrance Family', N'fragrance-family');
IF NOT EXISTS (SELECT 1 FROM dbo.ProductAttributes WHERE Slug = N'fragrance-type')
    INSERT INTO dbo.ProductAttributes (Name, Slug) VALUES (N'Fragrance Type', N'fragrance-type');

/* Categories â€” Men */
IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE DepartmentId = @Men AND Slug = N'clothing')
    INSERT INTO dbo.Categories (DepartmentId, ParentCategoryId, Name, Slug, SortOrder)
    VALUES (@Men, NULL, N'Clothing', N'clothing', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE DepartmentId = @Men AND Slug = N'footwear')
    INSERT INTO dbo.Categories (DepartmentId, ParentCategoryId, Name, Slug, SortOrder)
    VALUES (@Men, NULL, N'Footwear', N'footwear', 2);

DECLARE @MenClothing INT = (SELECT CategoryId FROM dbo.Categories WHERE DepartmentId = @Men AND Slug = N'clothing');
DECLARE @MenFootwear INT = (SELECT CategoryId FROM dbo.Categories WHERE DepartmentId = @Men AND Slug = N'footwear');

IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE DepartmentId = @Men AND Slug = N'shirts')
    INSERT INTO dbo.Categories (DepartmentId, ParentCategoryId, Name, Slug, SortOrder)
    VALUES (@Men, @MenClothing, N'Shirts', N'shirts', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE DepartmentId = @Men AND Slug = N'trousers')
    INSERT INTO dbo.Categories (DepartmentId, ParentCategoryId, Name, Slug, SortOrder)
    VALUES (@Men, @MenClothing, N'Trousers', N'trousers', 2);

DECLARE @MenShirts INT = (SELECT CategoryId FROM dbo.Categories WHERE DepartmentId = @Men AND Slug = N'shirts');

IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE DepartmentId = @Men AND Slug = N'casual-shirts')
    INSERT INTO dbo.Categories (DepartmentId, ParentCategoryId, Name, Slug, SortOrder)
    VALUES (@Men, @MenShirts, N'Casual Shirts', N'casual-shirts', 1);

IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE DepartmentId = @Men AND Slug = N'shoes')
    INSERT INTO dbo.Categories (DepartmentId, ParentCategoryId, Name, Slug, SortOrder)
    VALUES (@Men, @MenFootwear, N'Shoes', N'shoes', 1);

/* Categories â€” Women */
IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE DepartmentId = @Women AND Slug = N'clothing')
    INSERT INTO dbo.Categories (DepartmentId, ParentCategoryId, Name, Slug, SortOrder)
    VALUES (@Women, NULL, N'Clothing', N'clothing', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE DepartmentId = @Women AND Slug = N'fragrances')
    INSERT INTO dbo.Categories (DepartmentId, ParentCategoryId, Name, Slug, SortOrder)
    VALUES (@Women, NULL, N'Fragrances', N'fragrances', 2);

DECLARE @WomenClothing INT = (SELECT CategoryId FROM dbo.Categories WHERE DepartmentId = @Women AND Slug = N'clothing');
DECLARE @WomenFragrances INT = (SELECT CategoryId FROM dbo.Categories WHERE DepartmentId = @Women AND Slug = N'fragrances');

IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE DepartmentId = @Women AND Slug = N'dresses')
    INSERT INTO dbo.Categories (DepartmentId, ParentCategoryId, Name, Slug, SortOrder)
    VALUES (@Women, @WomenClothing, N'Dresses', N'dresses', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE DepartmentId = @Women AND Slug = N'perfumes')
    INSERT INTO dbo.Categories (DepartmentId, ParentCategoryId, Name, Slug, SortOrder)
    VALUES (@Women, @WomenFragrances, N'Perfumes', N'perfumes', 1);

/* Categories â€” Kids */
IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE DepartmentId = @Kids AND Slug = N'clothing')
    INSERT INTO dbo.Categories (DepartmentId, ParentCategoryId, Name, Slug, SortOrder)
    VALUES (@Kids, NULL, N'Clothing', N'clothing', 1);

DECLARE @KidsClothing INT = (SELECT CategoryId FROM dbo.Categories WHERE DepartmentId = @Kids AND Slug = N'clothing');

IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE DepartmentId = @Kids AND Slug = N't-shirts')
    INSERT INTO dbo.Categories (DepartmentId, ParentCategoryId, Name, Slug, SortOrder)
    VALUES (@Kids, @KidsClothing, N'T-Shirts', N't-shirts', 1);
GO

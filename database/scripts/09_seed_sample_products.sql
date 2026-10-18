USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

SET NOCOUNT ON;

DECLARE @Men INT = (SELECT DepartmentId FROM dbo.Departments WHERE Slug = N'men');
DECLARE @Women INT = (SELECT DepartmentId FROM dbo.Departments WHERE Slug = N'women');
DECLARE @Kids INT = (SELECT DepartmentId FROM dbo.Departments WHERE Slug = N'kids');

DECLARE @MenCasualShirts INT = (SELECT CategoryId FROM dbo.Categories WHERE DepartmentId = @Men AND Slug = N'casual-shirts');
DECLARE @MenTrousers INT = (SELECT CategoryId FROM dbo.Categories WHERE DepartmentId = @Men AND Slug = N'trousers');
DECLARE @MenShoes INT = (SELECT CategoryId FROM dbo.Categories WHERE DepartmentId = @Men AND Slug = N'shoes');
DECLARE @WomenDresses INT = (SELECT CategoryId FROM dbo.Categories WHERE DepartmentId = @Women AND Slug = N'dresses');
DECLARE @WomenPerfumes INT = (SELECT CategoryId FROM dbo.Categories WHERE DepartmentId = @Women AND Slug = N'perfumes');
DECLARE @KidsTees INT = (SELECT CategoryId FROM dbo.Categories WHERE DepartmentId = @Kids AND Slug = N't-shirts');

DECLARE @Black INT = (SELECT ColorId FROM dbo.Colors WHERE Name = N'Black');
DECLARE @White INT = (SELECT ColorId FROM dbo.Colors WHERE Name = N'White');
DECLARE @Navy INT = (SELECT ColorId FROM dbo.Colors WHERE Name = N'Navy');
DECLARE @Beige INT = (SELECT ColorId FROM dbo.Colors WHERE Name = N'Beige');
DECLARE @Maroon INT = (SELECT ColorId FROM dbo.Colors WHERE Name = N'Maroon');

DECLARE @S INT = (SELECT SizeId FROM dbo.Sizes WHERE SizeType = N'Clothing' AND Name = N'S');
DECLARE @M INT = (SELECT SizeId FROM dbo.Sizes WHERE SizeType = N'Clothing' AND Name = N'M');
DECLARE @L INT = (SELECT SizeId FROM dbo.Sizes WHERE SizeType = N'Clothing' AND Name = N'L');
DECLARE @Sz41 INT = (SELECT SizeId FROM dbo.Sizes WHERE SizeType = N'Footwear' AND Name = N'41');
DECLARE @Sz42 INT = (SELECT SizeId FROM dbo.Sizes WHERE SizeType = N'Footwear' AND Name = N'42');

DECLARE @Fabric INT = (SELECT ProductAttributeId FROM dbo.ProductAttributes WHERE Slug = N'fabric');
DECLARE @Fit INT = (SELECT ProductAttributeId FROM dbo.ProductAttributes WHERE Slug = N'fit');
DECLARE @Sleeve INT = (SELECT ProductAttributeId FROM dbo.ProductAttributes WHERE Slug = N'sleeve-type');
DECLARE @Material INT = (SELECT ProductAttributeId FROM dbo.ProductAttributes WHERE Slug = N'material');
DECLARE @FragFamily INT = (SELECT ProductAttributeId FROM dbo.ProductAttributes WHERE Slug = N'fragrance-family');
DECLARE @FragType INT = (SELECT ProductAttributeId FROM dbo.ProductAttributes WHERE Slug = N'fragrance-type');

/* Products */
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Slug = N'men-cotton-casual-shirt')
    INSERT INTO dbo.Products (Name, Slug, Description, Brand, Status)
    VALUES (N'Men Cotton Casual Shirt', N'men-cotton-casual-shirt', N'Everyday cotton casual shirt.', N'The Clothing Store', N'Active');

IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Slug = N'men-regular-trousers')
    INSERT INTO dbo.Products (Name, Slug, Description, Brand, Status)
    VALUES (N'Men Regular Trousers', N'men-regular-trousers', N'Straight regular-fit trousers.', N'The Clothing Store', N'Active');

IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Slug = N'women-linen-dress')
    INSERT INTO dbo.Products (Name, Slug, Description, Brand, Status)
    VALUES (N'Women Linen Dress', N'women-linen-dress', N'Breathable linen day dress.', N'The Clothing Store', N'Active');

IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Slug = N'kids-cotton-tshirt')
    INSERT INTO dbo.Products (Name, Slug, Description, Brand, Status)
    VALUES (N'Kids Cotton T-Shirt', N'kids-cotton-tshirt', N'Soft cotton tee for kids.', N'The Clothing Store', N'Active');

IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Slug = N'men-leather-oxford')
    INSERT INTO dbo.Products (Name, Slug, Description, Brand, Status)
    VALUES (N'Men Leather Oxford', N'men-leather-oxford', N'Classic leather oxford shoe.', N'The Clothing Store', N'Active');

IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Slug = N'women-woody-edp')
    INSERT INTO dbo.Products (Name, Slug, Description, Brand, Status)
    VALUES (N'Women Woody Eau de Parfum', N'women-woody-edp', N'Woody floral eau de parfum.', N'The Clothing Store', N'Active');

DECLARE @Shirt INT = (SELECT ProductId FROM dbo.Products WHERE Slug = N'men-cotton-casual-shirt');
DECLARE @Trousers INT = (SELECT ProductId FROM dbo.Products WHERE Slug = N'men-regular-trousers');
DECLARE @Dress INT = (SELECT ProductId FROM dbo.Products WHERE Slug = N'women-linen-dress');
DECLARE @KidsTee INT = (SELECT ProductId FROM dbo.Products WHERE Slug = N'kids-cotton-tshirt');
DECLARE @Oxford INT = (SELECT ProductId FROM dbo.Products WHERE Slug = N'men-leather-oxford');
DECLARE @Perfume INT = (SELECT ProductId FROM dbo.Products WHERE Slug = N'women-woody-edp');

/* Department / category maps */
IF NOT EXISTS (SELECT 1 FROM dbo.ProductDepartments WHERE ProductId = @Shirt AND DepartmentId = @Men)
    INSERT INTO dbo.ProductDepartments (ProductId, DepartmentId) VALUES (@Shirt, @Men);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductDepartments WHERE ProductId = @Trousers AND DepartmentId = @Men)
    INSERT INTO dbo.ProductDepartments (ProductId, DepartmentId) VALUES (@Trousers, @Men);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductDepartments WHERE ProductId = @Dress AND DepartmentId = @Women)
    INSERT INTO dbo.ProductDepartments (ProductId, DepartmentId) VALUES (@Dress, @Women);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductDepartments WHERE ProductId = @KidsTee AND DepartmentId = @Kids)
    INSERT INTO dbo.ProductDepartments (ProductId, DepartmentId) VALUES (@KidsTee, @Kids);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductDepartments WHERE ProductId = @Oxford AND DepartmentId = @Men)
    INSERT INTO dbo.ProductDepartments (ProductId, DepartmentId) VALUES (@Oxford, @Men);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductDepartments WHERE ProductId = @Perfume AND DepartmentId = @Women)
    INSERT INTO dbo.ProductDepartments (ProductId, DepartmentId) VALUES (@Perfume, @Women);

IF NOT EXISTS (SELECT 1 FROM dbo.ProductCategories WHERE ProductId = @Shirt AND CategoryId = @MenCasualShirts)
    INSERT INTO dbo.ProductCategories (ProductId, CategoryId) VALUES (@Shirt, @MenCasualShirts);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductCategories WHERE ProductId = @Trousers AND CategoryId = @MenTrousers)
    INSERT INTO dbo.ProductCategories (ProductId, CategoryId) VALUES (@Trousers, @MenTrousers);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductCategories WHERE ProductId = @Dress AND CategoryId = @WomenDresses)
    INSERT INTO dbo.ProductCategories (ProductId, CategoryId) VALUES (@Dress, @WomenDresses);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductCategories WHERE ProductId = @KidsTee AND CategoryId = @KidsTees)
    INSERT INTO dbo.ProductCategories (ProductId, CategoryId) VALUES (@KidsTee, @KidsTees);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductCategories WHERE ProductId = @Oxford AND CategoryId = @MenShoes)
    INSERT INTO dbo.ProductCategories (ProductId, CategoryId) VALUES (@Oxford, @MenShoes);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductCategories WHERE ProductId = @Perfume AND CategoryId = @WomenPerfumes)
    INSERT INTO dbo.ProductCategories (ProductId, CategoryId) VALUES (@Perfume, @WomenPerfumes);

/* Attributes */
IF NOT EXISTS (SELECT 1 FROM dbo.ProductAttributeValues WHERE ProductId = @Shirt AND ProductAttributeId = @Fabric)
    INSERT INTO dbo.ProductAttributeValues (ProductId, ProductAttributeId, AttributeValue) VALUES (@Shirt, @Fabric, N'Cotton');
IF NOT EXISTS (SELECT 1 FROM dbo.ProductAttributeValues WHERE ProductId = @Shirt AND ProductAttributeId = @Fit)
    INSERT INTO dbo.ProductAttributeValues (ProductId, ProductAttributeId, AttributeValue) VALUES (@Shirt, @Fit, N'Regular');
IF NOT EXISTS (SELECT 1 FROM dbo.ProductAttributeValues WHERE ProductId = @Shirt AND ProductAttributeId = @Sleeve)
    INSERT INTO dbo.ProductAttributeValues (ProductId, ProductAttributeId, AttributeValue) VALUES (@Shirt, @Sleeve, N'Full Sleeve');
IF NOT EXISTS (SELECT 1 FROM dbo.ProductAttributeValues WHERE ProductId = @Trousers AND ProductAttributeId = @Fit)
    INSERT INTO dbo.ProductAttributeValues (ProductId, ProductAttributeId, AttributeValue) VALUES (@Trousers, @Fit, N'Regular');
IF NOT EXISTS (SELECT 1 FROM dbo.ProductAttributeValues WHERE ProductId = @Dress AND ProductAttributeId = @Fabric)
    INSERT INTO dbo.ProductAttributeValues (ProductId, ProductAttributeId, AttributeValue) VALUES (@Dress, @Fabric, N'Linen');
IF NOT EXISTS (SELECT 1 FROM dbo.ProductAttributeValues WHERE ProductId = @KidsTee AND ProductAttributeId = @Fabric)
    INSERT INTO dbo.ProductAttributeValues (ProductId, ProductAttributeId, AttributeValue) VALUES (@KidsTee, @Fabric, N'Cotton');
IF NOT EXISTS (SELECT 1 FROM dbo.ProductAttributeValues WHERE ProductId = @Oxford AND ProductAttributeId = @Material)
    INSERT INTO dbo.ProductAttributeValues (ProductId, ProductAttributeId, AttributeValue) VALUES (@Oxford, @Material, N'Leather');
IF NOT EXISTS (SELECT 1 FROM dbo.ProductAttributeValues WHERE ProductId = @Perfume AND ProductAttributeId = @FragFamily)
    INSERT INTO dbo.ProductAttributeValues (ProductId, ProductAttributeId, AttributeValue) VALUES (@Perfume, @FragFamily, N'Woody');
IF NOT EXISTS (SELECT 1 FROM dbo.ProductAttributeValues WHERE ProductId = @Perfume AND ProductAttributeId = @FragType)
    INSERT INTO dbo.ProductAttributeValues (ProductId, ProductAttributeId, AttributeValue) VALUES (@Perfume, @FragType, N'Eau de Parfum');

/* Images */
IF NOT EXISTS (SELECT 1 FROM dbo.ProductImages WHERE ProductId = @Shirt AND IsPrimary = 1)
    INSERT INTO dbo.ProductImages (ProductId, ImageUrl, AltText, DisplayOrder, IsPrimary)
    VALUES (@Shirt, N'/images/products/men-cotton-casual-shirt-main.jpg', N'Men cotton casual shirt', 1, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductImages WHERE ProductId = @Shirt AND ImageUrl LIKE N'%-alt.jpg')
    INSERT INTO dbo.ProductImages (ProductId, ImageUrl, AltText, DisplayOrder, IsPrimary)
    VALUES (@Shirt, N'/images/products/men-cotton-casual-shirt-alt.jpg', N'Men cotton casual shirt back', 2, 0);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductImages WHERE ProductId = @Trousers AND IsPrimary = 1)
    INSERT INTO dbo.ProductImages (ProductId, ImageUrl, AltText, DisplayOrder, IsPrimary)
    VALUES (@Trousers, N'/images/products/men-regular-trousers-main.jpg', N'Men regular trousers', 1, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductImages WHERE ProductId = @Dress AND IsPrimary = 1)
    INSERT INTO dbo.ProductImages (ProductId, ImageUrl, AltText, DisplayOrder, IsPrimary)
    VALUES (@Dress, N'/images/products/women-linen-dress-main.jpg', N'Women linen dress', 1, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductImages WHERE ProductId = @KidsTee AND IsPrimary = 1)
    INSERT INTO dbo.ProductImages (ProductId, ImageUrl, AltText, DisplayOrder, IsPrimary)
    VALUES (@KidsTee, N'/images/products/kids-cotton-tshirt-main.jpg', N'Kids cotton t-shirt', 1, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductImages WHERE ProductId = @Oxford AND IsPrimary = 1)
    INSERT INTO dbo.ProductImages (ProductId, ImageUrl, AltText, DisplayOrder, IsPrimary)
    VALUES (@Oxford, N'/images/products/men-leather-oxford-main.jpg', N'Men leather oxford', 1, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductImages WHERE ProductId = @Perfume AND IsPrimary = 1)
    INSERT INTO dbo.ProductImages (ProductId, ImageUrl, AltText, DisplayOrder, IsPrimary)
    VALUES (@Perfume, N'/images/products/women-woody-edp-main.jpg', N'Women woody eau de parfum', 1, 1);

/* Variants */
IF NOT EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE Sku = N'TCS-SHIRT-BLK-S')
    INSERT INTO dbo.ProductVariants (ProductId, Sku, ColorId, SizeId, VolumeMl, RegularPrice)
    VALUES (@Shirt, N'TCS-SHIRT-BLK-S', @Black, @S, NULL, 3490.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE Sku = N'TCS-SHIRT-BLK-M')
    INSERT INTO dbo.ProductVariants (ProductId, Sku, ColorId, SizeId, VolumeMl, RegularPrice)
    VALUES (@Shirt, N'TCS-SHIRT-BLK-M', @Black, @M, NULL, 3490.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE Sku = N'TCS-SHIRT-WHT-S')
    INSERT INTO dbo.ProductVariants (ProductId, Sku, ColorId, SizeId, VolumeMl, RegularPrice)
    VALUES (@Shirt, N'TCS-SHIRT-WHT-S', @White, @S, NULL, 3490.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE Sku = N'TCS-TR-NVY-M')
    INSERT INTO dbo.ProductVariants (ProductId, Sku, ColorId, SizeId, VolumeMl, RegularPrice)
    VALUES (@Trousers, N'TCS-TR-NVY-M', @Navy, @M, NULL, 4290.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE Sku = N'TCS-TR-NVY-L')
    INSERT INTO dbo.ProductVariants (ProductId, Sku, ColorId, SizeId, VolumeMl, RegularPrice)
    VALUES (@Trousers, N'TCS-TR-NVY-L', @Navy, @L, NULL, 4290.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE Sku = N'TCS-DRS-MRN-M')
    INSERT INTO dbo.ProductVariants (ProductId, Sku, ColorId, SizeId, VolumeMl, RegularPrice)
    VALUES (@Dress, N'TCS-DRS-MRN-M', @Maroon, @M, NULL, 5990.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE Sku = N'TCS-KID-WHT-S')
    INSERT INTO dbo.ProductVariants (ProductId, Sku, ColorId, SizeId, VolumeMl, RegularPrice)
    VALUES (@KidsTee, N'TCS-KID-WHT-S', @White, @S, NULL, 1490.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE Sku = N'TCS-OXF-BLK-41')
    INSERT INTO dbo.ProductVariants (ProductId, Sku, ColorId, SizeId, VolumeMl, RegularPrice)
    VALUES (@Oxford, N'TCS-OXF-BLK-41', @Black, @Sz41, NULL, 8990.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE Sku = N'TCS-OXF-BLK-42')
    INSERT INTO dbo.ProductVariants (ProductId, Sku, ColorId, SizeId, VolumeMl, RegularPrice)
    VALUES (@Oxford, N'TCS-OXF-BLK-42', @Black, @Sz42, NULL, 8990.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE Sku = N'TCS-EDP-50')
    INSERT INTO dbo.ProductVariants (ProductId, Sku, ColorId, SizeId, VolumeMl, RegularPrice)
    VALUES (@Perfume, N'TCS-EDP-50', NULL, NULL, 50, 6490.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE Sku = N'TCS-EDP-100')
    INSERT INTO dbo.ProductVariants (ProductId, Sku, ColorId, SizeId, VolumeMl, RegularPrice)
    VALUES (@Perfume, N'TCS-EDP-100', NULL, NULL, 100, 9490.00);

/* Inventory + opening receipts */
INSERT INTO dbo.Inventory (ProductVariantId, QuantityOnHand, QuantityReserved)
SELECT pv.ProductVariantId, 25, 0
FROM dbo.ProductVariants pv
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Inventory i WHERE i.ProductVariantId = pv.ProductVariantId
);

INSERT INTO dbo.InventoryTransactions (InventoryId, TransactionType, QuantityChange, QuantityAfter, ReferenceType, Notes)
SELECT i.InventoryId, N'Receipt', i.QuantityOnHand, i.QuantityOnHand, N'Seed', N'Opening stock'
FROM dbo.Inventory i
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.InventoryTransactions t WHERE t.InventoryId = i.InventoryId AND t.ReferenceType = N'Seed'
);

/* Sale: 20% off casual shirt */
IF NOT EXISTS (SELECT 1 FROM dbo.Sales WHERE Name = N'Spring Shirt Promo')
    INSERT INTO dbo.Sales (Name, DiscountType, DiscountValue, StartsAt, EndsAt, IsActive)
    VALUES (N'Spring Shirt Promo', N'Percentage', 20.00, DATEADD(DAY, -1, SYSUTCDATETIME()), DATEADD(DAY, 30, SYSUTCDATETIME()), 1);

DECLARE @Sale INT = (SELECT SaleId FROM dbo.Sales WHERE Name = N'Spring Shirt Promo');
IF NOT EXISTS (SELECT 1 FROM dbo.SaleProducts WHERE SaleId = @Sale AND ProductId = @Shirt)
    INSERT INTO dbo.SaleProducts (SaleId, ProductId) VALUES (@Sale, @Shirt);

/* Fictional customer + address (not a real person) */
IF NOT EXISTS (SELECT 1 FROM dbo.Customers WHERE Email = N'shopper@example.com')
    INSERT INTO dbo.Customers (Email, FirstName, LastName, Phone)
    VALUES (N'shopper@example.com', N'Ayesha', N'Example', N'03000000000');

DECLARE @CustomerId INT = (SELECT CustomerId FROM dbo.Customers WHERE Email = N'shopper@example.com');

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerAddresses WHERE CustomerId = @CustomerId)
    INSERT INTO dbo.CustomerAddresses (CustomerId, FullName, Line1, City, Region, PostalCode, Country, IsDefaultShipping, IsDefaultBilling)
    VALUES (@CustomerId, N'Ayesha Example', N'123 Sample Street', N'Karachi', N'Sindh', N'74000', N'Pakistan', 1, 1);

/* Guest and customer carts */
DECLARE @ShirtBlkM INT = (SELECT ProductVariantId FROM dbo.ProductVariants WHERE Sku = N'TCS-SHIRT-BLK-M');
DECLARE @Edp50 INT = (SELECT ProductVariantId FROM dbo.ProductVariants WHERE Sku = N'TCS-EDP-50');

IF NOT EXISTS (SELECT 1 FROM dbo.Carts WHERE CustomerId = @CustomerId)
    INSERT INTO dbo.Carts (CustomerId, GuestToken) VALUES (@CustomerId, NULL);

DECLARE @GuestToken UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111111';
IF NOT EXISTS (SELECT 1 FROM dbo.Carts WHERE GuestToken = @GuestToken)
    INSERT INTO dbo.Carts (CustomerId, GuestToken) VALUES (NULL, @GuestToken);

DECLARE @CustCart INT = (SELECT CartId FROM dbo.Carts WHERE CustomerId = @CustomerId);
DECLARE @GuestCart INT = (SELECT CartId FROM dbo.Carts WHERE GuestToken = @GuestToken);

IF NOT EXISTS (SELECT 1 FROM dbo.CartItems WHERE CartId = @CustCart AND ProductVariantId = @ShirtBlkM)
    INSERT INTO dbo.CartItems (CartId, ProductVariantId, Quantity) VALUES (@CustCart, @ShirtBlkM, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.CartItems WHERE CartId = @GuestCart AND ProductVariantId = @Edp50)
    INSERT INTO dbo.CartItems (CartId, ProductVariantId, Quantity) VALUES (@GuestCart, @Edp50, 1);

/* Historical order snapshot (paid sample) */
IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderNumber = N'TCS-1001')
BEGIN
    INSERT INTO dbo.Orders (OrderNumber, CustomerId, Status, SubtotalAmount, DiscountAmount, ShippingAmount, TaxAmount, TotalAmount, ShippingName, ShippingLine1, ShippingCity, ShippingCountry)
    VALUES (N'TCS-1001', @CustomerId, N'Paid', 3490.00, 698.00, 200.00, 0.00, 2992.00, N'Ayesha Example', N'123 Sample Street', N'Karachi', N'Pakistan');

    DECLARE @OrderId INT = (SELECT OrderId FROM dbo.Orders WHERE OrderNumber = N'TCS-1001');

    INSERT INTO dbo.OrderItems (OrderId, ProductVariantId, ProductName, Sku, VariantDetails, Quantity, UnitPrice, DiscountAmount, LineTotal)
    VALUES (@OrderId, @ShirtBlkM, N'Men Cotton Casual Shirt', N'TCS-SHIRT-BLK-M', N'Black / M', 1, 3490.00, 698.00, 2792.00);

    INSERT INTO dbo.Payments (OrderId, Amount, Method, Provider, ProviderReference, Status, ProcessedAt)
    VALUES (@OrderId, 2992.00, N'COD', N'Manual', N'SEED-PAY-1001', N'Captured', SYSUTCDATETIME());

    INSERT INTO dbo.Shipments (OrderId, Carrier, TrackingNumber, Status)
    VALUES (@OrderId, N'TCS Logistics', N'TRK1001', N'Packed');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.NewsletterSubscriptions WHERE Email = N'news@example.com')
    INSERT INTO dbo.NewsletterSubscriptions (Email, Status) VALUES (N'news@example.com', N'Subscribed');

IF NOT EXISTS (SELECT 1 FROM dbo.AuditLogs WHERE EntityName = N'Sales' AND Action = N'Insert')
    INSERT INTO dbo.AuditLogs (EntityName, EntityId, Action, ChangeSummary)
    VALUES (N'Sales', CONVERT(NVARCHAR(20), @Sale), N'Insert', N'Seeded Spring Shirt Promo');
GO

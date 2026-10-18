USE [TheClothingStore];
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID(N'dbo.Orders', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Orders
    (
        OrderId INT IDENTITY(1, 1) NOT NULL,
        OrderNumber NVARCHAR(32) NOT NULL,
        CustomerId INT NULL,
        GuestEmail NVARCHAR(256) NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Orders_Status DEFAULT (N'Pending'),
        SubtotalAmount DECIMAL(18, 2) NOT NULL,
        DiscountAmount DECIMAL(18, 2) NOT NULL CONSTRAINT DF_Orders_DiscountAmount DEFAULT (0),
        ShippingAmount DECIMAL(18, 2) NOT NULL CONSTRAINT DF_Orders_ShippingAmount DEFAULT (0),
        TaxAmount DECIMAL(18, 2) NOT NULL CONSTRAINT DF_Orders_TaxAmount DEFAULT (0),
        TotalAmount DECIMAL(18, 2) NOT NULL,
        ShippingName NVARCHAR(160) NULL,
        ShippingLine1 NVARCHAR(200) NULL,
        ShippingCity NVARCHAR(100) NULL,
        ShippingRegion NVARCHAR(100) NULL,
        ShippingPostalCode NVARCHAR(20) NULL,
        ShippingCountry NVARCHAR(80) NULL,
        PlacedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Orders_PlacedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Orders PRIMARY KEY CLUSTERED (OrderId),
        CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId) REFERENCES dbo.Customers (CustomerId),
        CONSTRAINT UX_Orders_OrderNumber UNIQUE (OrderNumber),
        CONSTRAINT CK_Orders_Status CHECK (Status IN (N'Pending', N'Paid', N'Processing', N'Shipped', N'Completed', N'Cancelled')),
        CONSTRAINT CK_Orders_Amounts CHECK (
            SubtotalAmount >= 0
            AND DiscountAmount >= 0
            AND ShippingAmount >= 0
            AND TaxAmount >= 0
            AND TotalAmount >= 0
            AND TotalAmount = (SubtotalAmount - DiscountAmount + ShippingAmount + TaxAmount)
        ),
        CONSTRAINT CK_Orders_CustomerOrGuest CHECK (
            (CustomerId IS NOT NULL)
            OR (CustomerId IS NULL AND GuestEmail IS NOT NULL)
        )
    );
END
GO

IF OBJECT_ID(N'dbo.OrderItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderItems
    (
        OrderItemId INT IDENTITY(1, 1) NOT NULL,
        OrderId INT NOT NULL,
        ProductVariantId INT NULL,
        ProductName NVARCHAR(200) NOT NULL,
        Sku NVARCHAR(64) NOT NULL,
        VariantDetails NVARCHAR(200) NULL,
        Quantity INT NOT NULL,
        UnitPrice DECIMAL(18, 2) NOT NULL,
        DiscountAmount DECIMAL(18, 2) NOT NULL CONSTRAINT DF_OrderItems_DiscountAmount DEFAULT (0),
        LineTotal DECIMAL(18, 2) NOT NULL,
        CONSTRAINT PK_OrderItems PRIMARY KEY CLUSTERED (OrderItemId),
        CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders (OrderId),
        CONSTRAINT FK_OrderItems_ProductVariants FOREIGN KEY (ProductVariantId) REFERENCES dbo.ProductVariants (ProductVariantId) ON DELETE SET NULL,
        CONSTRAINT CK_OrderItems_Quantity CHECK (Quantity > 0),
        CONSTRAINT CK_OrderItems_Prices CHECK (
            UnitPrice >= 0
            AND DiscountAmount >= 0
            AND LineTotal >= 0
            AND LineTotal = (UnitPrice * Quantity - DiscountAmount)
        )
    );
END
GO

IF OBJECT_ID(N'dbo.Payments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Payments
    (
        PaymentId INT IDENTITY(1, 1) NOT NULL,
        OrderId INT NOT NULL,
        Amount DECIMAL(18, 2) NOT NULL,
        Method NVARCHAR(30) NOT NULL,
        Provider NVARCHAR(80) NULL,
        ProviderReference NVARCHAR(120) NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Payments_Status DEFAULT (N'Pending'),
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Payments_CreatedAt DEFAULT (SYSUTCDATETIME()),
        ProcessedAt DATETIME2(0) NULL,
        CONSTRAINT PK_Payments PRIMARY KEY CLUSTERED (PaymentId),
        CONSTRAINT FK_Payments_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders (OrderId),
        CONSTRAINT CK_Payments_Amount CHECK (Amount > 0),
        CONSTRAINT CK_Payments_Method CHECK (Method IN (N'Card', N'COD', N'Wallet', N'BankTransfer')),
        CONSTRAINT CK_Payments_Status CHECK (Status IN (N'Pending', N'Authorized', N'Captured', N'Failed', N'Refunded'))
    );
END
GO

IF OBJECT_ID(N'dbo.Shipments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Shipments
    (
        ShipmentId INT IDENTITY(1, 1) NOT NULL,
        OrderId INT NOT NULL,
        Carrier NVARCHAR(80) NULL,
        TrackingNumber NVARCHAR(80) NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Shipments_Status DEFAULT (N'Pending'),
        ShippedAt DATETIME2(0) NULL,
        DeliveredAt DATETIME2(0) NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Shipments_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Shipments PRIMARY KEY CLUSTERED (ShipmentId),
        CONSTRAINT FK_Shipments_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders (OrderId),
        CONSTRAINT CK_Shipments_Status CHECK (Status IN (N'Pending', N'Packed', N'Shipped', N'Delivered', N'Returned'))
    );
END
GO

IF OBJECT_ID(N'dbo.NewsletterSubscriptions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.NewsletterSubscriptions
    (
        NewsletterSubscriptionId INT IDENTITY(1, 1) NOT NULL,
        Email NVARCHAR(256) NOT NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Newsletter_Status DEFAULT (N'Subscribed'),
        SubscribedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Newsletter_SubscribedAt DEFAULT (SYSUTCDATETIME()),
        UnsubscribedAt DATETIME2(0) NULL,
        CONSTRAINT PK_NewsletterSubscriptions PRIMARY KEY CLUSTERED (NewsletterSubscriptionId),
        CONSTRAINT UX_NewsletterSubscriptions_Email UNIQUE (Email),
        CONSTRAINT CK_Newsletter_Status CHECK (Status IN (N'Subscribed', N'Unsubscribed')),
        CONSTRAINT CK_Newsletter_UnsubscribeTimestamp CHECK (
            (Status = N'Subscribed' AND UnsubscribedAt IS NULL)
            OR (Status = N'Unsubscribed' AND UnsubscribedAt IS NOT NULL)
        )
    );
END
GO

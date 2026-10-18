# Data dictionary

This dictionary describes the 25 application-owned tables created by scripts
`01`-`06`. Script `07` adds supporting indexes. `PK`, `FK`, `UQ`, and `CK`
denote primary key, foreign key, unique constraint/index, and check constraint.
All timestamps are UTC `DATETIME2(0)` unless stated otherwise.

## Reference and catalog

### Departments

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| DepartmentId | INT IDENTITY | No | PK |
| Name | NVARCHAR(100) | No | UQ |
| Slug | NVARCHAR(120) | No | UQ |
| SortOrder | INT | No | Default 0 |
| IsActive | BIT | No | Default 1 |
| CreatedAt | DATETIME2(0) | No | Default UTC now |
| UpdatedAt | DATETIME2(0) | Yes | |

### Colors

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| ColorId | INT IDENTITY | No | PK |
| Name | NVARCHAR(80) | No | UQ |
| HexCode | CHAR(7) | Yes | CK: null or `#RRGGBB` |
| SortOrder | INT | No | Default 0 |
| IsActive | BIT | No | Default 1 |
| CreatedAt | DATETIME2(0) | No | Default UTC now |

### Sizes

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| SizeId | INT IDENTITY | No | PK |
| SizeType | NVARCHAR(20) | No | CK: `Clothing` or `Footwear` |
| Name | NVARCHAR(30) | No | e.g. `M`, `42` |
| SortOrder | INT | No | Default 0 |
| IsActive | BIT | No | Default 1 |
| CreatedAt | DATETIME2(0) | No | Default UTC now |
| (SizeType, Name) | — | — | UQ |

### ProductAttributes

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| ProductAttributeId | INT IDENTITY | No | PK |
| Name | NVARCHAR(80) | No | UQ |
| Slug | NVARCHAR(80) | No | UQ |
| IsActive | BIT | No | Default 1 |
| CreatedAt | DATETIME2(0) | No | Default UTC now |

### Categories

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| CategoryId | INT IDENTITY | No | PK |
| DepartmentId | INT | No | FK Departments |
| ParentCategoryId | INT | Yes | FK Categories |
| Name | NVARCHAR(150) | No | |
| Slug | NVARCHAR(160) | No | Unique per department |
| SortOrder | INT | No | Default 0 |
| IsActive | BIT | No | Default 1 |
| IsDeleted | BIT | No | Default 0 |
| DeletedAt | DATETIME2(0) | Yes | |
| CreatedAt | DATETIME2(0) | No | Default UTC now |
| UpdatedAt | DATETIME2(0) | Yes | |
| Constraints | — | — | Parent cannot equal self; parent department consistency is enforced by application |

### Products

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| ProductId | INT IDENTITY | No | PK |
| Name | NVARCHAR(200) | No | |
| Slug | NVARCHAR(220) | No | UQ |
| Description | NVARCHAR(MAX) | Yes | |
| Brand | NVARCHAR(120) | Yes | |
| Status | NVARCHAR(20) | No | Draft, Active, Inactive |
| IsDeleted | BIT | No | Default 0 |
| DeletedAt | DATETIME2(0) | Yes | |
| CreatedAt | DATETIME2(0) | No | Default UTC now |
| UpdatedAt | DATETIME2(0) | Yes | |

### ProductDepartments

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| ProductId | INT | No | PK part; FK Products, delete cascades |
| DepartmentId | INT | No | PK part; FK Departments |
| (ProductId, DepartmentId) | — | — | Composite PK |

### ProductCategories

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| ProductId | INT | No | PK part; FK Products, delete cascades |
| CategoryId | INT | No | PK part; FK Categories |
| (ProductId, CategoryId) | — | — | Composite PK |

### ProductVariants

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| ProductVariantId | INT IDENTITY | No | PK |
| ProductId | INT | No | FK Products |
| Sku | NVARCHAR(64) | No | UQ |
| ColorId | INT | Yes | FK Colors |
| SizeId | INT | Yes | FK Sizes |
| VolumeMl | INT | Yes | CK null or > 0; used for volume variants |
| RegularPrice | DECIMAL(18,2) | No | CK >= 0 |
| IsActive | BIT | No | Default 1 |
| IsDeleted | BIT | No | Default 0 |
| DeletedAt | DATETIME2(0) | Yes | |
| CreatedAt | DATETIME2(0) | No | Default UTC now |
| UpdatedAt | DATETIME2(0) | Yes | |
| VariantSignature | NVARCHAR(83) computed, persisted | No | UQ; ProductId + ColorId + SizeId + VolumeMl |

### ProductImages

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| ProductImageId | INT IDENTITY | No | PK |
| ProductId | INT | No | FK Products, delete cascades |
| ImageUrl | NVARCHAR(500) | No | URL or path, not binary data |
| AltText | NVARCHAR(200) | Yes | |
| DisplayOrder | INT | No | Default 0; CK >= 0 |
| IsPrimary | BIT | No | Default 0; filtered unique index per product |
| CreatedAt | DATETIME2(0) | No | Default UTC now |

### ProductAttributeValues

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| ProductAttributeValueId | INT IDENTITY | No | PK |
| ProductId | INT | No | FK Products, delete cascades |
| ProductAttributeId | INT | No | FK ProductAttributes |
| AttributeValue | NVARCHAR(200) | No | |
| (ProductId, ProductAttributeId) | — | — | UQ; one value per attribute per product |

## Pricing and inventory

### Sales

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| SaleId | INT IDENTITY | No | PK |
| Name | NVARCHAR(150) | No | |
| DiscountType | NVARCHAR(20) | No | Percentage or FixedAmount |
| DiscountValue | DECIMAL(18,2) | No | Percentage 0-100; fixed amount > 0 |
| StartsAt / EndsAt | DATETIME2(0) | Yes | Optional UTC window; end >= start when both set |
| IsActive | BIT | No | Default 1 |
| IsDeleted | BIT | No | Default 0 |
| DeletedAt | DATETIME2(0) | Yes | |
| CreatedAt | DATETIME2(0) | No | Default UTC now |
| UpdatedAt | DATETIME2(0) | Yes | |

### SaleProducts

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| SaleId | INT | No | PK part; FK Sales, delete cascades |
| ProductId | INT | No | PK part; FK Products |
| (SaleId, ProductId) | — | — | Composite PK |

### Inventory

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| InventoryId | INT IDENTITY | No | PK |
| ProductVariantId | INT | No | FK ProductVariants; UQ (one row per variant) |
| QuantityOnHand | INT | No | Default 0; CK >= 0 |
| QuantityReserved | INT | No | Default 0; CK >= 0 and <= QuantityOnHand |
| UpdatedAt | DATETIME2(0) | No | Default UTC now |

Available quantity is calculated as `QuantityOnHand - QuantityReserved`; it is not stored.

### InventoryTransactions

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| InventoryTransactionId | BIGINT IDENTITY | No | PK |
| InventoryId | INT | No | FK Inventory |
| TransactionType | NVARCHAR(20) | No | Receipt, Sale, Adjustment, Reservation, Release |
| QuantityChange | INT | No | Signed stock change |
| QuantityAfter | INT | No | CK >= 0 |
| ReferenceType | NVARCHAR(40) | Yes | |
| ReferenceId | INT | Yes | |
| Notes | NVARCHAR(400) | Yes | |
| CreatedAt | DATETIME2(0) | No | Default UTC now |

## Customers, carts, and orders

### Customers

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| CustomerId | INT IDENTITY | No | PK |
| IdentityUserId | NVARCHAR(450) | Yes | Filtered UQ when not null; future Identity FK |
| Email | NVARCHAR(256) | No | UQ |
| FirstName / LastName | NVARCHAR(80) | Yes | |
| Phone | NVARCHAR(30) | Yes | |
| IsDeleted | BIT | No | Default 0 |
| DeletedAt | DATETIME2(0) | Yes | |
| CreatedAt | DATETIME2(0) | No | Default UTC now |
| UpdatedAt | DATETIME2(0) | Yes | |

### CustomerAddresses

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| CustomerAddressId | INT IDENTITY | No | PK |
| CustomerId | INT | No | FK Customers, delete cascades |
| FullName | NVARCHAR(160) | No | |
| Line1 / Line2 | NVARCHAR(200) | No / Yes | |
| City | NVARCHAR(100) | No | |
| Region | NVARCHAR(100) | Yes | |
| PostalCode | NVARCHAR(20) | Yes | |
| Country | NVARCHAR(80) | No | Default Pakistan |
| Phone | NVARCHAR(30) | Yes | |
| IsDefaultShipping / IsDefaultBilling | BIT | No | Default 0 |
| IsDeleted | BIT | No | Default 0 |
| DeletedAt | DATETIME2(0) | Yes | |
| CreatedAt | DATETIME2(0) | No | Default UTC now |

### Carts

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| CartId | INT IDENTITY | No | PK |
| CustomerId | INT | Yes | FK Customers, delete cascades; filtered UQ |
| GuestToken | UNIQUEIDENTIFIER | Yes | Filtered UQ; generated securely by backend |
| CreatedAt / UpdatedAt | DATETIME2(0) | No | Defaults UTC now |
| Owner constraint | — | — | Exactly one of CustomerId and GuestToken is non-null |

### CartItems

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| CartItemId | INT IDENTITY | No | PK |
| CartId | INT | No | FK Carts, delete cascades |
| ProductVariantId | INT | No | FK ProductVariants |
| Quantity | INT | No | CK > 0 |
| CreatedAt | DATETIME2(0) | No | Default UTC now |
| UpdatedAt | DATETIME2(0) | Yes | |
| (CartId, ProductVariantId) | — | — | UQ |

### Orders

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| OrderId | INT IDENTITY | No | PK |
| OrderNumber | NVARCHAR(32) | No | UQ |
| CustomerId | INT | Yes | FK Customers; no cascade |
| GuestEmail | NVARCHAR(256) | Yes | Required when CustomerId is null |
| Status | NVARCHAR(20) | No | Pending, Paid, Processing, Shipped, Completed, Cancelled |
| SubtotalAmount / DiscountAmount / ShippingAmount / TaxAmount / TotalAmount | DECIMAL(18,2) | No | Nonnegative; total = subtotal - discount + shipping + tax |
| ShippingName | NVARCHAR(160) | Yes | Historical address snapshot |
| ShippingLine1 | NVARCHAR(200) | Yes | |
| ShippingCity / ShippingRegion | NVARCHAR(100) | Yes | |
| ShippingPostalCode | NVARCHAR(20) | Yes | |
| ShippingCountry | NVARCHAR(80) | Yes | |
| PlacedAt | DATETIME2(0) | No | Default UTC now |

### OrderItems

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| OrderItemId | INT IDENTITY | No | PK |
| OrderId | INT | No | FK Orders; no cascade |
| ProductVariantId | INT | Yes | FK ProductVariants; SET NULL on variant deletion |
| ProductName | NVARCHAR(200) | No | Historical snapshot |
| Sku | NVARCHAR(64) | No | Historical snapshot |
| VariantDetails | NVARCHAR(200) | Yes | Historical snapshot |
| Quantity | INT | No | CK > 0 |
| UnitPrice / DiscountAmount / LineTotal | DECIMAL(18,2) | No | Nonnegative; line total = unit price * quantity - discount |

### Payments

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| PaymentId | INT IDENTITY | No | PK |
| OrderId | INT | No | FK Orders; no cascade |
| Amount | DECIMAL(18,2) | No | CK > 0 |
| Method | NVARCHAR(30) | No | Card, COD, Wallet, BankTransfer |
| Provider | NVARCHAR(80) | Yes | |
| ProviderReference | NVARCHAR(120) | Yes | No raw card data or credentials |
| Status | NVARCHAR(20) | No | Pending, Authorized, Captured, Failed, Refunded |
| CreatedAt | DATETIME2(0) | No | Default UTC now |
| ProcessedAt | DATETIME2(0) | Yes | |

### Shipments

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| ShipmentId | INT IDENTITY | No | PK |
| OrderId | INT | No | FK Orders; no cascade |
| Carrier | NVARCHAR(80) | Yes | |
| TrackingNumber | NVARCHAR(80) | Yes | |
| Status | NVARCHAR(20) | No | Pending, Packed, Shipped, Delivered, Returned |
| ShippedAt / DeliveredAt | DATETIME2(0) | Yes | |
| CreatedAt | DATETIME2(0) | No | Default UTC now |

## Other operational tables

### NewsletterSubscriptions

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| NewsletterSubscriptionId | INT IDENTITY | No | PK |
| Email | NVARCHAR(256) | No | UQ |
| Status | NVARCHAR(20) | No | Subscribed or Unsubscribed |
| SubscribedAt | DATETIME2(0) | No | Default UTC now |
| UnsubscribedAt | DATETIME2(0) | Yes | Required when status is Unsubscribed; null when Subscribed |

### AuditLogs

| Column | SQL Server type | Null | Key / rule |
| --- | --- | --- | --- |
| AuditLogId | BIGINT IDENTITY | No | PK |
| EntityName | NVARCHAR(80) | No | |
| EntityId | NVARCHAR(64) | Yes | |
| Action | NVARCHAR(20) | No | Insert, Update, Delete, Login, Other |
| IdentityUserId | NVARCHAR(450) | Yes | Identity user identifier; FK deferred until Identity exists |
| ChangeSummary | NVARCHAR(1000) | Yes | |
| CreatedAt | DATETIME2(0) | No | Default UTC now |

## Identity-owned tables

`AspNetUsers`, `AspNetRoles`, `AspNetUserRoles`, claims, logins, and tokens are
created by ASP.NET Core Identity in Phase 2, not by these scripts. There are no
parallel `Roles`, `AdminUsers`, or `AdminUserRoles` tables.

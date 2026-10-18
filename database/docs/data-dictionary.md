# Data dictionary

Synced with scripts `01`–`07`. Types are SQL Server.

## Departments

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| DepartmentId | INT IDENTITY | PK | |
| Name | NVARCHAR(100) | N | Unique |
| Slug | NVARCHAR(120) | N | Unique |
| SortOrder | INT | N | Default 0 |
| IsActive | BIT | N | Default 1 |
| CreatedAt / UpdatedAt | DATETIME2(0) | N / Y | UTC |

## Colors

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| ColorId | INT IDENTITY | PK | |
| Name | NVARCHAR(80) | N | Unique |
| HexCode | CHAR(7) | Y | `#RRGGBB` |
| SortOrder | INT | N | |
| IsActive | BIT | N | |
| CreatedAt | DATETIME2(0) | N | |

## Sizes

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| SizeId | INT IDENTITY | PK | |
| SizeType | NVARCHAR(20) | N | `Clothing` or `Footwear` |
| Name | NVARCHAR(30) | N | e.g. `M`, `42` |
| SortOrder | INT | N | |
| IsActive | BIT | N | |
| Unique | | | `(SizeType, Name)` |

## ProductAttributes

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| ProductAttributeId | INT IDENTITY | PK | |
| Name | NVARCHAR(80) | N | Unique, e.g. Fabric |
| Slug | NVARCHAR(80) | N | Unique |
| IsActive | BIT | N | |

## Categories

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| CategoryId | INT IDENTITY | PK | |
| DepartmentId | INT | N | FK Departments |
| ParentCategoryId | INT | Y | FK Categories |
| Name | NVARCHAR(150) | N | |
| Slug | NVARCHAR(160) | N | Unique per department |
| SortOrder | INT | N | |
| IsActive / IsDeleted | BIT | N | Soft delete |
| DeletedAt | DATETIME2(0) | Y | |
| CreatedAt / UpdatedAt | DATETIME2(0) | N / Y | |
| Check | | | `ParentCategoryId <> CategoryId` |

## Products

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| ProductId | INT IDENTITY | PK | |
| Name | NVARCHAR(200) | N | |
| Slug | NVARCHAR(220) | N | Unique |
| Description | NVARCHAR(MAX) | Y | |
| Brand | NVARCHAR(120) | Y | |
| Status | NVARCHAR(20) | N | `Draft`,`Active`,`Inactive` |
| IsDeleted | BIT | N | |
| DeletedAt | DATETIME2(0) | Y | |
| CreatedAt / UpdatedAt | DATETIME2(0) | N / Y | |

No SKU, price, color, size, or stock on this table.

## ProductDepartments / ProductCategories

Composite PK `(ProductId, DepartmentId)` / `(ProductId, CategoryId)`.

## ProductVariants

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| ProductVariantId | INT IDENTITY | PK | |
| ProductId | INT | N | FK |
| Sku | NVARCHAR(64) | N | Unique |
| ColorId | INT | Y | FK Colors |
| SizeId | INT | Y | FK Sizes |
| VolumeMl | INT | Y | Perfume only; `> 0` |
| RegularPrice | DECIMAL(18,2) | N | `>= 0` |
| IsActive / IsDeleted | BIT | N | |
| DeletedAt | DATETIME2(0) | Y | |
| CreatedAt / UpdatedAt | DATETIME2(0) | N / Y | |
| VariantSignature | NVARCHAR(80) | N | Persisted computed unique option key |

## ProductImages

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| ProductImageId | INT IDENTITY | PK | |
| ProductId | INT | N | FK CASCADE |
| ImageUrl | NVARCHAR(500) | N | Path or URL |
| AltText | NVARCHAR(200) | Y | |
| DisplayOrder | INT | N | `>= 0` |
| IsPrimary | BIT | N | Unique filtered: one primary per product |

## ProductAttributeValues

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| ProductAttributeValueId | INT IDENTITY | PK | |
| ProductId | INT | N | FK CASCADE |
| ProductAttributeId | INT | N | FK |
| AttributeValue | NVARCHAR(200) | N | e.g. Cotton |
| Unique | | | `(ProductId, ProductAttributeId)` |

## Sales / SaleProducts

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| SaleId | INT IDENTITY | PK | |
| Name | NVARCHAR(150) | N | |
| DiscountType | NVARCHAR(20) | N | `Percentage` or `FixedAmount` |
| DiscountValue | DECIMAL(18,2) | N | % 0–100 or amount `> 0` |
| StartsAt / EndsAt | DATETIME2(0) | Y | UTC window |
| IsActive / IsDeleted | BIT | N | |
| SaleProducts | | | PK `(SaleId, ProductId)` |

## Inventory

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| InventoryId | INT IDENTITY | PK | |
| ProductVariantId | INT | N | Unique FK |
| QuantityOnHand | INT | N | `>= 0` |
| QuantityReserved | INT | N | `>= 0` and `<= QuantityOnHand` |
| UpdatedAt | DATETIME2(0) | N | |

Available qty is not stored: `QuantityOnHand - QuantityReserved`.

## InventoryTransactions

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| InventoryTransactionId | BIGINT IDENTITY | PK | |
| InventoryId | INT | N | FK NO ACTION |
| TransactionType | NVARCHAR(20) | N | Receipt, Sale, Adjustment, Reservation, Release |
| QuantityChange | INT | N | Signed |
| QuantityAfter | INT | N | `>= 0` |
| ReferenceType / ReferenceId | NVARCHAR(40) / INT | Y | Order, admin, etc. |
| Notes | NVARCHAR(400) | Y | |
| CreatedAt | DATETIME2(0) | N | |

## Customers

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| CustomerId | INT IDENTITY | PK | |
| IdentityUserId | NVARCHAR(450) | Y | Filtered unique when not null; future Identity FK |
| Email | NVARCHAR(256) | N | Unique |
| FirstName / LastName | NVARCHAR(80) | Y | |
| Phone | NVARCHAR(30) | Y | |
| IsDeleted | BIT | N | |
| DeletedAt | DATETIME2(0) | Y | |
| CreatedAt / UpdatedAt | DATETIME2(0) | N / Y | |

No password columns.

## CustomerAddresses

Standard name/line/city/region/postal/country fields, `IsDefaultShipping`, `IsDefaultBilling`, soft delete.

## Carts / CartItems

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| CartId | INT IDENTITY | PK | |
| CustomerId | INT | Y | Unique if not null |
| GuestToken | UNIQUEIDENTIFIER | Y | Unique if not null |
| CreatedAt / UpdatedAt | DATETIME2(0) | N | |
| CartItem | | | Unique `(CartId, ProductVariantId)`; `Quantity > 0` |
| Check | | | Exactly one of CustomerId / GuestToken |

## Orders

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| OrderId | INT IDENTITY | PK | |
| OrderNumber | NVARCHAR(32) | N | Unique |
| CustomerId | INT | Y | FK NO ACTION |
| GuestEmail | NVARCHAR(256) | Y | Required if no customer |
| Status | NVARCHAR(20) | N | Pending, Paid, Processing, Shipped, Completed, Cancelled |
| SubtotalAmount, DiscountAmount, ShippingAmount, TaxAmount, TotalAmount | DECIMAL(18,2) | N | `>= 0`; total consistent check |
| PlacedAt | DATETIME2(0) | N | |

## OrderItems

Snapshots: `ProductName`, `Sku`, `VariantDetails`, `Quantity`, `UnitPrice`, `DiscountAmount`, `LineTotal`. `ProductVariantId` nullable SET NULL.

## Payments

`Amount`, `Method` (Card, COD, Wallet, BankTransfer), `Provider`/`ProviderReference` (no PAN/CVV), `Status` (Pending, Authorized, Captured, Failed, Refunded), timestamps.

## Shipments

`Carrier`, `TrackingNumber`, `Status` (Pending, Packed, Shipped, Delivered, Returned), `ShippedAt`, `DeliveredAt`.

## NewsletterSubscriptions

Unique `Email`, `Status` Subscribed/Unsubscribed, `SubscribedAt`, `UnsubscribedAt`.

## AuditLogs

`EntityName`, `EntityId`, `Action` (Insert/Update/Delete/Login), `IdentityUserId`, `ChangeSummary`, `CreatedAt`. No Identity FK yet.

## Identity tables (not created)

`AspNetUsers`, `AspNetRoles`, `AspNetUserRoles`, claims/logins/tokens — created by ASP.NET Core Identity in Phase 2.

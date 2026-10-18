# Database Mapping Audit

Audited against `database/scripts/01`-`07`, the synchronized data dictionary and
relationship guide, and the live `TheClothingStore` database on
`DESKTOP-AVKQ6HC` (SQL Server 2022 Developer Edition, compatibility level 160).
The existing database was online and read-write. Scripts `00`-`10` completed
successfully; no schema reset was performed. See the data dictionary for every
column, SQL type, nullability, and default.

## Schema inventory

The database has 25 tables in `dbo`:

| Area | Tables | Keys and mapping notes |
| --- | --- | --- |
| Reference | `Departments`, `Colors`, `Sizes`, `ProductAttributes` | Identity `INT` PKs; names/slugs and `(SizeType, Name)` are unique as defined in DDL. |
| Catalog | `Categories`, `Products`, `ProductDepartments`, `ProductCategories`, `ProductVariants`, `ProductImages`, `ProductAttributeValues` | `Products.ProductId` is the catalog root. Variants own SKU, regular price and optional color/size/volume. Product-to-department/category maps use composite PKs. |
| Pricing / stock | `Sales`, `SaleProducts`, `Inventory`, `InventoryTransactions` | Sales apply to products; inventory is one row per variant; transaction rows reference inventory. |
| Customer / cart | `Customers`, `CustomerAddresses`, `Carts`, `CartItems` | Customer profile uses `CustomerId`; carts have exactly one of `CustomerId` or `GuestToken`; lines reference variants. |
| Orders / fulfillment | `Orders`, `OrderItems`, `Payments`, `Shipments` | Order items snapshot product name, SKU, variant text, quantity, price and discount. Payment and shipment are separate order children. |
| Operations | `NewsletterSubscriptions`, `AuditLogs` | Unique newsletter email; audit actor is a nullable, unconstrained Identity user ID. |

## Relationships and delete behavior

| Child FK | Parent | Delete behavior |
| --- | --- | --- |
| `Categories.DepartmentId` | `Departments.DepartmentId` | NO ACTION |
| `Categories.ParentCategoryId` | `Categories.CategoryId` | NO ACTION |
| `ProductDepartments.ProductId` | `Products.ProductId` | CASCADE |
| `ProductDepartments.DepartmentId` | `Departments.DepartmentId` | NO ACTION |
| `ProductCategories.ProductId` | `Products.ProductId` | CASCADE |
| `ProductCategories.CategoryId` | `Categories.CategoryId` | NO ACTION |
| `ProductVariants.ProductId` | `Products.ProductId` | NO ACTION |
| `ProductVariants.ColorId` | `Colors.ColorId` | NO ACTION |
| `ProductVariants.SizeId` | `Sizes.SizeId` | NO ACTION |
| `ProductImages.ProductId` | `Products.ProductId` | CASCADE |
| `ProductAttributeValues.ProductId` | `Products.ProductId` | CASCADE |
| `ProductAttributeValues.ProductAttributeId` | `ProductAttributes.ProductAttributeId` | NO ACTION |
| `SaleProducts.SaleId` | `Sales.SaleId` | CASCADE |
| `SaleProducts.ProductId` | `Products.ProductId` | NO ACTION |
| `Inventory.ProductVariantId` | `ProductVariants.ProductVariantId` | NO ACTION |
| `InventoryTransactions.InventoryId` | `Inventory.InventoryId` | NO ACTION |
| `CustomerAddresses.CustomerId` | `Customers.CustomerId` | CASCADE |
| `Carts.CustomerId` | `Customers.CustomerId` | CASCADE |
| `CartItems.CartId` | `Carts.CartId` | CASCADE |
| `CartItems.ProductVariantId` | `ProductVariants.ProductVariantId` | NO ACTION |
| `Orders.CustomerId` | `Customers.CustomerId` | NO ACTION |
| `OrderItems.OrderId` | `Orders.OrderId` | NO ACTION |
| `OrderItems.ProductVariantId` | `ProductVariants.ProductVariantId` | SET NULL |
| `Payments.OrderId` | `Orders.OrderId` | NO ACTION |
| `Shipments.OrderId` | `Orders.OrderId` | NO ACTION |

There is no SQL FK from `Customers.IdentityUserId` or
`AuditLogs.IdentityUserId` to Identity. There are 25 FKs total, all enabled and
trusted in the audited database.

## Keys, checks, and indexes

**Primary keys:** each entity table uses its declared identity PK; mapping tables
use `(ProductId, DepartmentId)`, `(ProductId, CategoryId)`, and
`(SaleId, ProductId)` composite PKs.

**Unique keys / indexes:** `Departments(Name, Slug)`, `Colors(Name)`,
`Sizes(SizeType, Name)`, `ProductAttributes(Name, Slug)`,
`Categories(DepartmentId, Slug)`, `Products(Slug)`,
`ProductVariants(Sku, VariantSignature)`,
`ProductAttributeValues(ProductId, ProductAttributeId)`,
`Inventory(ProductVariantId)`, `Customers(Email)`, `CartItems(CartId, ProductVariantId)`,
`Orders(OrderNumber)`, and `NewsletterSubscriptions(Email)`. Filtered unique
indexes enforce non-null uniqueness for `Customers.IdentityUserId`,
`Carts.CustomerId`, `Carts.GuestToken`, and one primary `ProductImages` row per
product. The corresponding declared names are `UX_Departments_Name`,
`UX_Departments_Slug`, `UX_Colors_Name`, `UX_Sizes_Type_Name`,
`UX_ProductAttributes_Name`, `UX_ProductAttributes_Slug`,
`UX_Categories_Department_Slug`, `UX_Products_Slug`,
`UX_ProductVariants_Sku`, `UX_ProductVariants_Signature`,
`UX_ProductAttributeValues_Product_Attribute`, `UX_Inventory_ProductVariantId`,
`UX_Customers_Email`, `UX_CartItems_Cart_Variant`, `UX_Orders_OrderNumber`,
and `UX_NewsletterSubscriptions_Email`; mapping-table uniqueness is provided
by their composite PKs. The four filtered unique index names are listed below.

**Check constraints:** `CK_Colors_HexCode`, `CK_Sizes_SizeType`,
`CK_Categories_ParentNotSelf`, `CK_Products_Status`,
`CK_ProductVariants_VolumeMl`, `CK_ProductVariants_RegularPrice`,
`CK_Sales_DiscountType`, `CK_Sales_DiscountValue`, `CK_Sales_Window`,
`CK_Inventory_OnHand`, `CK_Inventory_Reserved`,
`CK_Inventory_ReservedNotAboveOnHand`, `CK_InventoryTransactions_Type`,
`CK_InventoryTransactions_QuantityAfter`, `CK_Carts_Owner`,
`CK_CartItems_Quantity`, `CK_Orders_Status`, `CK_Orders_Amounts`,
`CK_Orders_CustomerOrGuest`, `CK_OrderItems_Quantity`, `CK_OrderItems_Prices`,
`CK_Payments_Amount`, `CK_Payments_Method`, `CK_Payments_Status`,
`CK_Shipments_Status`, `CK_Newsletter_Status`,
`CK_Newsletter_UnsubscribeTimestamp`, and `CK_AuditLogs_Action`. These enforce
valid hex/size/status/type/window values, nonnegative price and stock, reserved
stock not above on-hand, exclusive cart ownership, positive quantities/payment
amounts, amount arithmetic, guest/customer order ownership, and lifecycle
timestamp consistency.
The live database reports no disabled or untrusted CHECK constraints.

**Indexes from script `07`:** all 24 names and key definitions are present in
the live database:

| Index | Key / include / filter |
| --- | --- |
| `UX_Customers_IdentityUserId` | unique `(IdentityUserId)` where not null |
| `UX_Carts_CustomerId` | unique `(CustomerId)` where not null |
| `UX_Carts_GuestToken` | unique `(GuestToken)` where not null |
| `UX_ProductImages_Primary` | unique `(ProductId)` where `IsPrimary = 1` |
| `IX_Categories_ParentCategoryId` | `(ParentCategoryId)` |
| `IX_ProductDepartments_DepartmentId` | `(DepartmentId, ProductId)` |
| `IX_ProductCategories_CategoryId` | `(CategoryId, ProductId)` |
| `IX_Products_Status` | `(Status)` where `IsDeleted = 0` |
| `IX_ProductVariants_ProductId` | `(ProductId)` include `Sku, RegularPrice, IsActive` |
| `IX_ProductVariants_ColorId` | `(ColorId, ProductId)` where `ColorId IS NOT NULL` |
| `IX_ProductVariants_SizeId` | `(SizeId, ProductId)` where `SizeId IS NOT NULL` |
| `IX_ProductImages_ProductId` | `(ProductId, DisplayOrder)` |
| `IX_ProductAttributeValues_AttributeId` | `(ProductAttributeId, ProductId)` include `AttributeValue` |
| `IX_SaleProducts_ProductId` | `(ProductId)` |
| `IX_Sales_ActiveWindow` | `(IsActive, StartsAt, EndsAt)` where `IsDeleted = 0` |
| `IX_InventoryTransactions_InventoryId` | `(InventoryId, CreatedAt)` |
| `IX_Orders_CustomerId` | `(CustomerId, PlacedAt)` |
| `IX_OrderItems_OrderId` | `(OrderId)` |
| `IX_OrderItems_ProductVariantId` | `(ProductVariantId)` where not null |
| `IX_Payments_OrderId` | `(OrderId, Status)` |
| `IX_Shipments_OrderId` | `(OrderId)` |
| `IX_AuditLogs_Entity` | `(EntityName, EntityId, CreatedAt)` |
| `IX_CustomerAddresses_CustomerId` | `(CustomerId)` |
| `IX_CartItems_ProductVariantId` | `(ProductVariantId)` include `CartId, Quantity` |

Primary-key indexes are the declared table PKs; the three mapping tables use
composite PKs `(ProductId, DepartmentId)`, `(ProductId, CategoryId)`, and
`(SaleId, ProductId)`.

## EF Core mapping rules

- Map every commerce entity explicitly to schema `dbo` and the existing plural
  table name. Use explicit `HasColumnName`, lengths, requiredness, defaults,
  precision, keys, indexes, computed-column metadata, and delete behaviors.
- Map SQL `DECIMAL(18,2)` properties with precision `(18,2)`, timestamps as
  `DateTime`/`DateTime?` with `datetime2(0)`, and stored status strings as
  strings (not integer enums). SQL Server supplies UTC defaults for columns
  declared with `SYSUTCDATETIME()`.
- `ProductVariants.VariantSignature` is a persisted computed `NVARCHAR(83)`
  unique column; treat it as database-generated and do not write it.
- Preserve the composite mapping-table keys and SQL's cascade / NO ACTION /
  SET NULL behavior. Do not cascade-delete orders, payments, shipment or ledger
  history.
- Use filtered unique indexes exactly as declared; ordinary unique EF indexes
  would not preserve nullable uniqueness semantics.

## Identity and workflow compatibility

| Requirement | Existing support | Backend boundary / required action |
| --- | --- | --- |
| Identity login, password hashes, roles | No Identity tables exist; no parallel `Roles` / `AdminUsers` tables exist. | `ClothingStoreDbContext` uses ASP.NET Core Identity with the commerce tables explicitly excluded from migrations. A reviewed, additive Identity-only migration script is at `database/proposed/identity-initial.sql`; it has not been applied. |
| Customer profile link | `Customers.IdentityUserId NVARCHAR(450) NULL` with a filtered unique index. | Map Identity string ID. The FK is absent; add it only after Identity tables are deployed and existing IDs are validated. |
| Audit actor | `AuditLogs.IdentityUserId NVARCHAR(450) NULL`, no FK. | Record the Identity subject ID; keep audit writes independent of Identity deletion. |
| Guest/customer carts | `Carts` has `GuestToken UNIQUEIDENTIFIER`, optional customer FK, owner CHECK, and filtered unique owner indexes. | Generate guest tokens server-side; use cookie; merge under a transaction and verify each variant. |
| Cart merge | Cart and cart-line relationships support it. | No merge marker or result table; make merge repeatable by upserting unique `(CartId, ProductVariantId)` lines then deleting the guest cart in one transaction. |
| Orders and snapshots | Order totals and snapshots exist; `OrderNumber` is unique. | Recalculate prices server-side and retain snapshots. A request GUID and buyer scope produce a deterministic `OrderNumber`; the existing unique key provides idempotent retries without changing the schema. |
| Inventory and concurrency | Variant inventory, reserved quantity, nonnegative checks, and transaction history exist. | Checkout immediately decrements on-hand stock under SQL Server update locks in the order transaction; cancellation restores it before payment capture. This initial flow does not reserve stock. Reservation history lacks reserved-delta snapshots, so reservation/release flows are not implemented. |
| Payments | Payment table supports method/provider reference/status; no payment credentials are stored. | Only COD is enabled. COD stays pending until an admin records collection with a reason. No online provider or webhook exists; external payments cannot be marked successful. |
| Email workflows | Newsletter email/status/timestamps exist. | No email-delivery configuration exists for password reset or subscription confirmation. Do not claim an email was sent. |
| Address snapshots | Address entity has line 2 and phone; order snapshot stores name, line 1, city, region, postal code, country only. | Checkout may preserve only those order columns; preserving line 2/phone historically requires nullable additive order columns. |
| Featured products | Product table has no featured flag or curated ranking. | The endpoint derives a best-seller ranking from non-cancelled order lines; it does not persist or imply a merchandising flag. |
| Admin auditing | `AuditLogs` exists with actor, action, entity, timestamp and summary. | Write audit records in the same transaction as important admin changes; never log secrets. |
| Categories/default addresses | Category parent self-reference is protected, but same-department ancestry and cycles are not database-enforced. Address default flags have no filtered unique constraints. | Validate category ancestry and serialize default-address changes in the service; consider filtered unique indexes if database-level enforcement is required. |

The live database has no user, role, Identity, idempotency, email-provider, or
payment-provider tables/configuration beyond the commerce schema described here.
The generated Identity migration creates only the seven standard `AspNet*`
tables plus `__EFMigrationsHistory`; it is a proposal and has not been applied.
No commerce schema change is proposed or applied. Checkout currently uses zero
shipping and tax because no shipping-rate or tax-rule tables/configuration exist.

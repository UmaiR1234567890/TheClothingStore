# Database design — The Clothing Store

## Purpose

SQL Server catalog, commerce, and operational schema for a J.-inspired fashion store. The approved backend maps to this schema; the Angular frontend remains a later phase.

## Naming

- Schemas: `dbo` only.
- Tables and columns: PascalCase singular table names (`Products`, `Orders`).
- Primary keys: `<TableSingular>Id` identity `INT`, except natural composite keys on mapping tables.
- Foreign keys: same name as the referenced PK.
- Unique indexes: `UX_<Table>_<Columns>`.
- Non-unique indexes: `IX_<Table>_<Columns>`.
- Check constraints: `CK_<Table>_<Rule>`.
- Money: `DECIMAL(18, 2)` never `FLOAT`/`REAL`.
- Timestamps: `DATETIME2(0)` UTC via `SYSUTCDATETIME()`.

## Architecture

1. **Catalog** — departments, hierarchical categories, products, variants, images, descriptive attributes.
2. **Commerce options** — shared `Colors` and `Sizes`; perfume volume on the variant (`VolumeMl`).
3. **Pricing** — `ProductVariants.RegularPrice` is the only regular-price source of truth. Sales adjust that price at read/checkout time.
4. **Inventory** — one inventory row per variant; transactions are append-only history.
5. **Identity-adjacent people** — `Customers` are commerce profiles. Authentication is Identity (future).
6. **Carts** — persisted guest and customer carts.
7. **Orders** — immutable-enough snapshots on line items; payments and shipments; no stored card data.
8. **Ops** — newsletter; audit log of admin-relevant changes.

## Main entities

| Area | Tables |
| --- | --- |
| Reference | `Departments`, `Colors`, `Sizes`, `ProductAttributes` |
| Catalog | `Categories`, `Products`, `ProductDepartments`, `ProductCategories`, `ProductVariants`, `ProductImages`, `ProductAttributeValues` |
| Pricing / stock | `Sales`, `SaleProducts`, `Inventory`, `InventoryTransactions` |
| People / carts | `Customers`, `CustomerAddresses`, `Carts`, `CartItems` |
| Fulfillment | `Orders`, `OrderItems`, `Payments`, `Shipments`, `NewsletterSubscriptions` |
| Admin | `AuditLogs` only (Identity supplies users/roles later) |

## Design principles

- Product ≠ purchasable SKU. Variants own SKU, price, and stock.
- Descriptive attributes (fabric, fit, fragrance family) are EAV-style (`ProductAttributes` + `ProductAttributeValues`), not extra columns.
- A product can sit in multiple departments/categories via mapping tables.
- Historical orders copy name, SKU, variant text, qty, unit price, and discount onto `OrderItems`.
- Soft delete is used only where reuse, catalogs, or customer records need retention. Ledger-like rows are not soft-deleted.

## Soft deletion / retention

| Entity | Approach |
| --- | --- |
| Departments, Colors, Sizes, ProductAttributes, Categories, Products, ProductVariants, Sales, Customers, CustomerAddresses | `IsActive` and/or `IsDeleted` + `DeletedAt` |
| InventoryTransactions, OrderItems, Payments, AuditLogs | Retain forever; no soft delete |
| Orders, Shipments | Status fields (`Cancelled`, etc.); no physical delete |
| NewsletterSubscriptions | Retain row; `Status` and subscription timestamps record lifecycle |
| Carts | Physical delete of abandoned carts is an application job; no soft delete required |

## Pricing (single source of truth)

1. Display/checkout starts from `ProductVariants.RegularPrice`.
2. A sale applies if `Sales.IsActive = 1`, `IsDeleted = 0`, current UTC is within `StartsAt`/`EndsAt` (null end = open), and the product is in `SaleProducts`.
3. Percentage: `RegularPrice * (1 - DiscountValue/100)`. Fixed: `RegularPrice - DiscountValue`. Floor at 0.00.
4. If several sales match, choose the lowest resulting price (greatest customer discount).
5. Do not persist “effective price” on the variant. Persist it only on `OrderItems` at checkout.

## Inventory concurrency (backend contract)

- Available = `QuantityOnHand - QuantityReserved`.
- Check constraints keep on-hand and reserved non-negative and reserved ≤ on-hand.
- Future API must reserve/decrement in a transaction with row locks (`UPDLOCK, ROWLOCK`) so two checkouts cannot oversell.
- Adjustments write `InventoryTransactions`.

## Identity mapping

- Do **not** create `AspNetUsers`, password hashes, or parallel `Roles`/`AdminUsers` tables.
- `Customers.IdentityUserId NVARCHAR(450) NULL UNIQUE` matches default Identity string PKs. Add an FK after Identity migrations exist.
- Admin authentication and role assignment come from Identity. `AuditLogs.IdentityUserId` records who changed what.

## Guest cart merge (backend contract)

1. Guest cart is keyed by a cryptographically random `GuestToken` in an HTTP-only cookie.
2. On login/register, load the customer’s cart (create if missing) and the guest cart.
3. For each guest line: if the same `ProductVariantId` exists, add quantities (cap later by stock); else move the line.
4. Delete the guest cart after merge.
5. Continue using the customer cart only.

## Assumptions

- Currency is a single store currency (PKR conceptually; no multi-currency table).
- Guest checkout is allowed (`Orders.CustomerId` nullable, `GuestEmail` required when no customer).
- One persistent cart per customer; one cart per guest token. The backend clears or merges cart items after checkout/login as appropriate.
- Size types are `Clothing` and `Footwear` only.
- Image binaries live on disk/CDN; the database stores URL/path only.
- The existing `TheClothingStore` database was verified online and read-write on `DESKTOP-AVKQ6HC` (SQL Server 2022 Developer Edition, `16.0.1210.3`, compatibility level 160). Scripts `00`-`10` completed successfully on 2026-10-18; the existing database was not dropped or reset. Other environments must select their own authorized SQL Server instance and authentication.

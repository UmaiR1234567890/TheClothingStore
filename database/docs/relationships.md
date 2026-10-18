# Relationships

Cardinalities use “1” and “N”. Delete actions are SQL Server FK actions.

## Catalog

| Parent | Child | Cardinality | FK | On delete |
| --- | --- | --- | --- | --- |
| Departments | Categories | 1:N | `Categories.DepartmentId` | NO ACTION |
| Categories | Categories | 1:N (tree) | `Categories.ParentCategoryId` | NO ACTION |
| Products | ProductDepartments | 1:N | `ProductId` | CASCADE |
| Departments | ProductDepartments | 1:N | `DepartmentId` | NO ACTION |
| Products | ProductCategories | 1:N | `ProductId` | CASCADE |
| Categories | ProductCategories | 1:N | `CategoryId` | NO ACTION |
| Products | ProductVariants | 1:N | `ProductId` | NO ACTION |
| Colors | ProductVariants | 1:N | `ColorId` | NO ACTION |
| Sizes | ProductVariants | 1:N | `SizeId` | NO ACTION |
| Products | ProductImages | 1:N | `ProductId` | CASCADE |
| Products | ProductAttributeValues | 1:N | `ProductId` | CASCADE |
| ProductAttributes | ProductAttributeValues | 1:N | `ProductAttributeId` | NO ACTION |

Many-to-many:

- Product ↔ Department via `ProductDepartments`.
- Product ↔ Category via `ProductCategories`.

A category belongs to one department. Parent category should share that department (enforced in the future backend; not a SQL CHECK across rows).

## Pricing and inventory

| Parent | Child | Cardinality | FK | On delete |
| --- | --- | --- | --- | --- |
| Sales | SaleProducts | 1:N | `SaleId` | CASCADE |
| Products | SaleProducts | 1:N | `ProductId` | NO ACTION |
| ProductVariants | Inventory | 1:1 | `ProductVariantId` | NO ACTION |
| Inventory | InventoryTransactions | 1:N | `InventoryId` | NO ACTION |

## Customers and carts

| Parent | Child | Cardinality | FK | On delete |
| --- | --- | --- | --- | --- |
| Customers | CustomerAddresses | 1:N | `CustomerId` | CASCADE |
| Customers | Carts | 1:0..1 | `Carts.CustomerId` | CASCADE |
| Carts | CartItems | 1:N | `CartId` | CASCADE |
| ProductVariants | CartItems | 1:N | `ProductVariantId` | NO ACTION |

Guest carts have `GuestToken` and null `CustomerId`. Customer carts have the reverse. Future `AspNetUsers.Id` → `Customers.IdentityUserId` (1:0..1).

## Orders and fulfillment

| Parent | Child | Cardinality | FK | On delete |
| --- | --- | --- | --- | --- |
| Customers | Orders | 1:N | `CustomerId` | NO ACTION |
| Orders | OrderItems | 1:N | `OrderId` | NO ACTION |
| ProductVariants | OrderItems | 1:N | `ProductVariantId` nullable | SET NULL |
| Orders | Payments | 1:N | `OrderId` | NO ACTION |
| Orders | Shipments | 1:N | `OrderId` | NO ACTION |

`OrderItems.ProductVariantId` is nullable so a variant can be retired without destroying history. Snapshot columns remain.

## Newsletter and audit

`NewsletterSubscriptions` is independent (email uniqueness).

`AuditLogs` does not FK to Identity yet (`IdentityUserId` is an unconstrained `NVARCHAR(450)` until Identity tables exist).

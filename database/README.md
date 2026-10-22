# The Clothing Store — Database

SQL Server schema, documentation, and seed scripts for Phase 1.

## SQL Server requirement

| Setting | Value |
| --- | --- |
| Database | `TheClothingStore` |
| Engine | Microsoft SQL Server (a supported local or remote instance) |

The `sqlcmd` utility and local default `MSSQLSERVER` instance were verified. On
2026-10-18, `DESKTOP-AVKQ6HC` reported SQL Server 2022 Developer Edition
(`16.0.1210.3`); `TheClothingStore` was online, read-write, and at compatibility
level 160. Scripts `00`-`10` ran successfully against this existing database.
The database was not dropped or reset. For another environment, select an
authorized instance and authentication method. Scripts are ordered; do not skip
files.

After the run, the database contained 25 application tables, 6 products, 11
variants, 11 inventory rows, 1 order, 2 carts, and 1 newsletter subscription.
The verification script passed its table, index, constraint, inventory,
department, and variant assertions. See `10_verification_queries.sql` for
details.

## Run order

From the repository root, in a terminal with `sqlcmd`:

Use `sqlcmd -I` so `QUOTED_IDENTIFIER` is on (required for computed columns and filtered indexes).
Replace `your-server-or-instance` with the authorized SQL Server name. The
examples use Windows authentication (`-E`); use the authentication appropriate
to your environment.

```bat
sqlcmd -S your-server-or-instance -E -b -i "database\scripts\00_create_database.sql"
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\01_reference_tables.sql"
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\02_catalog_tables.sql"
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\03_pricing_and_inventory.sql"
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\04_customers_and_carts.sql"
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\05_orders_and_fulfillment.sql"
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\06_admin_and_audit.sql"
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\07_constraints_and_indexes.sql"
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\08_seed_reference_data.sql"
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\09_seed_sample_products.sql"
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\10_verification_queries.sql"
```

## Optional Men Shirts sample

`09_seed_sample_products.sql` already seeds a Men cotton casual shirt under
the `Casual Shirts` child category. If you specifically need a product linked
directly to the parent `Men > Clothing > Shirts` category, run this additional
idempotent DML script after scripts `00`-`10`:

```bat
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\11_seed_mens_shirt_sample.sql"
```

It adds a fictional sample product, a White / M variant, and an opening
inventory receipt only when those rows are missing. It does not reset or delete
existing data.

To add ten distinct fictional shirt products directly to the same parent
`Men > Clothing > Shirts` category, run this idempotent DML script after
scripts `00`-`10`:

```bat
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\12_seed_ten_mens_shirts.sql"
```

It creates one color/size variant per product and an opening quantity of 12
for each newly created inventory row. Existing products, variants, and stock
are not duplicated or incremented when the script is rerun.

To replace the active Men Shirts catalog with the two image-backed samples
(one primary image URL per shirt), run this script after `00`-`10`:

```bat
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\13_keep_two_mens_shirts.sql"
```

This soft-deletes the other Men Shirts products and deactivates their variants
so historical order/cart references remain intact. It does not physically
delete records.

To give each of the two remaining shirts four colors and four clothing sizes
(16 variants per shirt), run this script after `13_keep_two_mens_shirts.sql`:

```bat
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\14_expand_two_mens_shirts_to_4x4_variants.sql"
```

It retains each shirt's existing variant and stock, adds missing combinations,
and creates a zero-stock inventory row for each new variant. The existing
product-level images are shared by all variants; no image records are
duplicated.

To enable color-specific image galleries on the existing database, run the
additive schema script below. Existing image rows receive a NULL `ColorId` and
remain shared fallback images; no image rows or files are removed.

```bat
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\15_product_images_by_color.sql"
```

After the numbered image files exist in `Angular/public/images/products`, map
one image to each color gallery with:

```bat
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\16_assign_mens_shirt_color_images.sql"
```

The numbered color slots map to the seeded colors in this order: Black, White,
Navy, Beige. The image paths are static Angular assets; the API stores only
their URL references.

To give every shirt/color gallery Front, Back, and Side entries, run:

```bat
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\17_add_front_back_side_mens_shirt_images.sql"
```

Only front photos are currently available. The Back and Side rows are labeled
placeholders that reuse the front URL; replace their URLs with real views when
those image files are available. The script is idempotent and keeps the gallery
below the five-image limit.

To make all 32 variants of the two sample shirts available for local cart
testing, run:

```bat
sqlcmd -S your-server-or-instance -E -b -I -d TheClothingStore -i "database\scripts\18_seed_mens_shirt_test_stock.sql"
```

This raises available stock to at least 12 per active variant and records an
inventory adjustment for each changed row. It does not reduce existing stock
or touch other products.

For a local content reset that preserves the Admin login, review
`database/scripts/19_reset_store_data_keep_admin.sql`. It clears commerce
records and keeps department/category/color/size/attribute reference data by
default. Set `@DeleteReferenceData = 1` only if you also want those lookups
cleared; run `08_seed_reference_data.sql` afterward before creating products.
The script was executed against the local database with reference data kept.
It now defaults back to `@ConfirmReset = 0`; uploaded files on disk were not
removed.

## Documentation

- [Database design](docs/database-design.md)
- [Relationships](docs/relationships.md)
- [Data dictionary](docs/data-dictionary.md)

## Authentication

The local `TheClothingStore` database now has the ASP.NET Core Identity tables
from [proposed/identity-initial.sql](proposed/identity-initial.sql). The
development superuser uses the `Admin` role; Identity stores a password hash,
not the plaintext password. `Customers.IdentityUserId` and
`AuditLogs.IdentityUserId` remain separate nullable mappings.

For a different development database, apply the Identity script after the
catalog schema, then provision a local Admin without putting a password in
source control:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:TCS_ADMIN_BOOTSTRAP_PASSWORD = "<strong-password>"
dotnet run --project src/ClothingStore.Api -- --provision-admin-env admin@example.local
Remove-Item Env:TCS_ADMIN_BOOTSTRAP_PASSWORD
```

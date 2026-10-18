# The Clothing Store — Database

SQL Server schema, documentation, and seed scripts for Phase 1.

## Target environment

| Setting | Value |
| --- | --- |
| Server | `DESKTOP-AVKQ6HC` |
| Database | `TheClothingStore` |
| Authentication | Windows (trusted connection) |
| Engine | Microsoft SQL Server 2022 Developer Edition |

Scripts are ordered. Do not skip files. Do not drop an existing database.

## Run order

From a machine with `sqlcmd`:

Use `sqlcmd -I` so `QUOTED_IDENTIFIER` is on (required for computed columns and filtered indexes).

```bat
sqlcmd -S DESKTOP-AVKQ6HC -E -i "database\scripts\00_create_database.sql"
sqlcmd -S DESKTOP-AVKQ6HC -E -I -d TheClothingStore -i "database\scripts\01_reference_tables.sql"
sqlcmd -S DESKTOP-AVKQ6HC -E -I -d TheClothingStore -i "database\scripts\02_catalog_tables.sql"
sqlcmd -S DESKTOP-AVKQ6HC -E -I -d TheClothingStore -i "database\scripts\03_pricing_and_inventory.sql"
sqlcmd -S DESKTOP-AVKQ6HC -E -I -d TheClothingStore -i "database\scripts\04_customers_and_carts.sql"
sqlcmd -S DESKTOP-AVKQ6HC -E -I -d TheClothingStore -i "database\scripts\05_orders_and_fulfillment.sql"
sqlcmd -S DESKTOP-AVKQ6HC -E -I -d TheClothingStore -i "database\scripts\06_admin_and_audit.sql"
sqlcmd -S DESKTOP-AVKQ6HC -E -I -d TheClothingStore -i "database\scripts\07_constraints_and_indexes.sql"
sqlcmd -S DESKTOP-AVKQ6HC -E -I -d TheClothingStore -i "database\scripts\08_seed_reference_data.sql"
sqlcmd -S DESKTOP-AVKQ6HC -E -I -d TheClothingStore -i "database\scripts\09_seed_sample_products.sql"
sqlcmd -S DESKTOP-AVKQ6HC -E -I -d TheClothingStore -i "database\scripts\10_verification_queries.sql"
```

## Documentation

- [Database design](docs/database-design.md)
- [Relationships](docs/relationships.md)
- [Data dictionary](docs/data-dictionary.md)

## Authentication

Passwords, logins, and application roles are **not** stored in this schema. They will be provided later by ASP.NET Core Identity (`AspNetUsers`, `AspNetRoles`, and related tables). `Customers.IdentityUserId` and `AuditLogs.IdentityUserId` are reserved for that mapping.

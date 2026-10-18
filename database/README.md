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

## Documentation

- [Database design](docs/database-design.md)
- [Relationships](docs/relationships.md)
- [Data dictionary](docs/data-dictionary.md)

## Authentication

Passwords, logins, and application roles are **not** stored in this schema. They will be provided later by ASP.NET Core Identity (`AspNetUsers`, `AspNetRoles`, and related tables). `Customers.IdentityUserId` and `AuditLogs.IdentityUserId` are reserved for that mapping.

The Identity-only additive SQL generated for the backend is at
[proposed/identity-initial.sql](proposed/identity-initial.sql). It is not part of
the `00`-`10` setup sequence and has not been applied. Review and authorize it
before provisioning Identity tables in an existing database.

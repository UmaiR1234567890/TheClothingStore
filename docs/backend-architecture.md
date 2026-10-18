# Backend Architecture

## Solution layout

The backend is a .NET 8 modular monolith:

- `src/ClothingStore.Api` owns controllers, HTTP policies, middleware, Swagger,
  CORS, rate limiting, and application startup.
- `src/ClothingStore.Application` owns request/response DTOs, use-case
  contracts, pricing rules, and order-transition policy.
- `src/ClothingStore.Domain` owns the 25 commerce entities and stored status
  constants.
- `src/ClothingStore.Infrastructure` owns the SQL Server EF Core context,
  explicit entity mappings, ASP.NET Core Identity, JWT issuance, and service
  implementations.
- `tests/ClothingStore.UnitTests` covers deterministic business rules.
- `tests/ClothingStore.IntegrationTests` uses an isolated EF InMemory database
  for HTTP smoke tests; it never targets the existing SQL Server database.

Controllers are thin and return a consistent `ApiResponse<T>` envelope.
Infrastructure services own queries, ownership checks, transactions, audit
records, and state transitions. No generic repository layer is used.

## Persistence and schema safety

`ClothingStoreDbContext` extends `IdentityDbContext<ApplicationUser>` and maps
the existing commerce tables to their exact `dbo` names. Every commerce table
is explicitly excluded from EF migrations. Identity's seven standard tables
are not present in the existing database; `database/proposed/identity-initial.sql`
is the additive, generated Identity-only migration script. It has not been
applied. Startup does not call `EnsureCreated`, `Migrate`, or execute DDL.

Stored status values remain strings and map to SQL CHECK constraints. Money is
`DECIMAL(18,2)`, timestamps use `datetime2(0)`, the product variant signature is
database-generated, and SQL foreign-key delete behavior is explicit. Full
schema decisions and known gaps are in `docs/database-mapping.md`.

## Authentication and authorization

- ASP.NET Core Identity hashes passwords and manages lockout/password policy.
- API tokens are HS256 JWTs, issued for 15 minutes by default. Issuer, audience,
  signature, expiration, and algorithm are validated.
- Configure the signing key through user-secrets or `Jwt__SigningKey`; there is
  no committed key. No refresh token is issued.
- Logout tells clients to discard the token; it does not revoke a signed JWT.
- Admin controllers require the Identity role `Admin`. No public role-grant
  endpoint or automatic admin account is provided. After Identity is
  provisioned, an operator can use the explicit `--provision-admin` console
  command to create/assign the role.
- Customer ownership is resolved from the authenticated Identity ID through
  `Customers.IdentityUserId`; clients cannot submit customer IDs for their own
  operations.
- Login and registration are limited to 10 requests per client IP per minute.

## Catalog, price, and inventory

Catalog filters and pagination run in SQL. Sort fields are allowlisted.
Attributes remain descriptive EAV values and are separate from color, size,
and volume variant options.

`IPricingCalculator` applies only active, non-deleted, in-window sales and
selects the lowest effective price. Product lists, details, carts, and checkout
share this rule. Regular price is never overwritten.

Checkout decrements on-hand quantity while holding SQL Server update locks in
the order transaction, writes inventory ledger rows, snapshots order lines,
creates the payment record, and clears cart items atomically. It does not
reserve stock. A failed transaction rolls the work back. Cancellation restores
stock for unpaid Pending/Processing orders. Reservation/release workflows and
online payment failure compensation are not enabled.

## Checkout, payment, and external services

- Checkout idempotency hashes the buyer scope and request GUID into the
  existing unique `OrderNumber`; no schema column is added.
- COD is the only enabled payment method. It remains Pending until an
  administrator explicitly records collection with a reason. No real provider
  is called and no arbitrary customer can set payment status.
- Shipping and tax are initially zero because no rate/rule data exists.
- Password reset returns `503` until an email provider is configured. Newsletter
  state is persisted, but no confirmation email is sent.
- Images are URL/path references only; no upload-storage service is claimed.

## API conventions

Routes use `/api/v1`. Normal responses have `success`, `message`, `data`, and
optional `errors`. Paginated `data` has `items`, `pageNumber`, `pageSize`,
`totalCount`, and `totalPages`. Validation returns `400`; unexpected failures
return a generic `500` with a trace reference. Stack traces and configuration
secrets are not returned.

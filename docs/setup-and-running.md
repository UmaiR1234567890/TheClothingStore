# Setup and Running

## Requirements

- .NET 8 SDK (the checked environment currently has the .NET 9 SDK, but .NET 8
  targeting packs/runtime are installed; all projects target `net8.0`).
- SQL Server with the existing `TheClothingStore` schema.
- NuGet access for restore. Package versions are centrally pinned in
  `Directory.Packages.props`.

## Restore, build, and test

From the repository root:

```powershell
dotnet restore ClothingStore.sln
dotnet build ClothingStore.sln --no-restore
dotnet test ClothingStore.sln --no-restore
```

Integration tests replace SQL Server with an isolated EF InMemory provider.
They do not connect to or reset `TheClothingStore`.

## Configuration

`appsettings.Development.json` contains the local Windows-authenticated
development connection string and public JWT issuer/audience. It contains no
JWT signing secret. Set a secret of at least 32 UTF-8 bytes using user-secrets:

```powershell
dotnet user-secrets init --project src/ClothingStore.Api
dotnet user-secrets set "Jwt:SigningKey" "<random-development-key-at-least-32-bytes>" --project src/ClothingStore.Api
```

For another SQL Server, override `ConnectionStrings:TheClothingStore` using
user-secrets or `ConnectionStrings__TheClothingStore`. Do not commit passwords,
JWT keys, or provider credentials. The API refuses to issue tokens unless the
issuer, audience, signing key, and 5-30 minute expiry are valid.

Set explicitly approved Angular origins in `Cors:AllowedOrigins`, or
`Cors__AllowedOrigins__0` for a single origin. The list is empty by default;
credentials are allowed only with configured explicit origins. Do not use
`AllowAnyOrigin` for credentialed requests.

## Run the API

```powershell
dotnet run --project src/ClothingStore.Api
```

Swagger is enabled only in Development at `/swagger`. Health endpoints are
`/api/v1/health` and `/api/v1/health/ready`.

The development connection string points to local SQL Server. The code does not
create or migrate commerce tables at startup. The observed SQL Server database
already contains the commerce schema. No production connection string is
committed.

## Identity schema deployment prerequisite

The existing database has no `AspNet*` tables, so registration, login, and
role-backed authorization require the Identity-only schema first. Review
`database/proposed/identity-initial.sql`; it creates the standard Identity
tables and EF migration history only. It does not alter commerce tables and
has **not** been run. Apply it only to the intended database after a DBA reviews
and authorizes the change. No application startup migration is enabled.

The migration is source-controlled under
`src/ClothingStore.Infrastructure/Persistence/Migrations`. Commerce tables are
excluded from EF migrations. `Customers.IdentityUserId` and
`AuditLogs.IdentityUserId` remain without SQL foreign keys; validate existing
data before adding an optional FK from customer profiles to `AspNetUsers`.

After the Identity tables are provisioned, an operator can create/assign the
`Admin` role through the explicit CLI command below. It prompts for the
password without echoing it and is never run automatically:

```powershell
dotnet run --project src/ClothingStore.Api -- --provision-admin admin@example.com
```

If the Identity user already exists, the supplied password must verify before
the role is assigned. There is no HTTP role-grant endpoint.

## Known service limitations

- Password reset returns 503 until a secure email provider is configured.
- Logout discards the client token only; JWTs expire after 15 minutes and are
  not server-revocable. No refresh tokens are implemented.
- Cash on delivery is the only payment method. Admin COD collection requires a
  reason; no online payment provider or webhook is configured.
- Shipping and tax are zero until business rules/configuration are supplied.
- Featured products are derived from non-cancelled order quantities because no
  featured flag exists.
- Checkout stores the address snapshot columns available in `Orders`; it
  cannot retain address line 2 or phone historically.
- Category slugs are unique per department, not globally.
- Backend cancellation/restock covers unpaid Pending/Processing orders; paid
  refund behavior is deliberately not fabricated.

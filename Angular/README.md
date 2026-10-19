# The Clothing Store — Angular storefront

Responsive Angular client for the existing ASP.NET Core API. Angular talks to
the API over HTTP and never connects directly to SQL Server.

## Versions and prerequisites

- Angular framework: 18.2.x (lockfile: 18.2.14); Angular CLI: 18.2.21.
- Node.js: 18.20.8; npm: 10.8.2.
- Chrome/Chromium is needed for the Karma unit-test command.
- The backend API and its SQL Server database are separate prerequisites for
  real catalog, cart, account, and admin data.

Angular 18 is the requested version but is an end-of-support release. The
current `npm audit` reports high-severity advisories against direct Angular
runtime packages as well as build/test tooling. Treat this version as
development-only until it is upgraded to a supported Angular major and the
dependency audit is clean.

## Install and run locally

From this directory:

```sh
npm ci
npm start
```

Open `http://localhost:4200`. The Angular dev-server proxy forwards `/api/*`
and `/images/*` to `http://localhost:5077`, the backend's HTTP development
profile. Start the API from the repository root in a second terminal:

```sh
dotnet run --project src/ClothingStore.Api
```

The local API URL comes from its launch profile. If you use a different port,
update `proxy.conf.json`; services continue to use the single configurable API
base URL in `src/environments/environment.ts`.

## Build and tests

```sh
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

`ng build` is the production build. Karma/Jasmine tests use `HttpTestingController`
and do not create orders or call a real backend. No lint or browser E2E runner is
configured yet; a manual E2E checklist is in
`../docs/frontend-integration-audit.md`.

## API and deployment configuration

- Development and production API base paths are configured in
  `src/environments/environment.ts` and
  `src/environments/environment.production.ts`. They contain no credentials.
- Production uses the relative `/api/v1` path; configure a same-origin reverse
  proxy for `/api/v1/*` and `/images/*`. Configure SPA history fallback for
  product, category, account, and admin routes.
- Product images are API-returned URLs or paths. The backend serves any image
  files; the frontend provides an accessible fallback when a path is missing.
- This workspace is client-rendered only. Angular SSR is not configured, so
  server-side rendering and full search-engine indexing are not claimed.
- Keep signing keys, SQL connection strings, Identity setup, and other secrets
  in backend/server configuration only.

## Authentication and data handling

The API issues short-lived JWT Bearer tokens and has no refresh-token endpoint.
The frontend keeps the access token in `sessionStorage` so a tab reload can
restore the session; browser script access remains possible if an XSS bug is
introduced. A pending checkout idempotency key (UUID only, no address or
payment data) is also held in `sessionStorage` to block blind resubmission
after an uncertain response. The interceptor sends the token only to protected
API routes and sends credentials to the same-origin API proxy for the
guest-cart cookie.
Logout clears the browser token; the backend does not revoke it, so it remains
valid until expiry. Never store passwords.

Catalog prices, cart totals, stock, order state, payment state, and admin
authorization are server-authoritative. Checkout sends a UUID idempotency key
and displays the server-validated totals and resulting order only after API
confirmation.

## Current API limitations

- The current database does not yet contain the ASP.NET Core Identity tables.
  Registration, login, customer profile, and admin-role flows require the
  backend Identity schema and configured users/roles.
- Password recovery currently returns HTTP 503 because email delivery is not
  configured.
- COD is the only payment method. No online provider, card form, webhook, or
  refund workflow is available.
- The backend currently calculates shipping and tax as zero. Checkout still
  displays the server response rather than calculating totals locally.
- No wishlist endpoint exists; the frontend omits wishlist persistence.
- The catalog API accepts `ColorId` and `SizeId` filters but has no public
  reference/facet endpoints. The catalog therefore does not invent color or
  size lists; exact options are selected on product pages.
- Cart lines do not include product image URLs or product slugs. Cart rows use
  an original brand-mark fallback rather than fabricated catalog data.
- Admin variant forms accept numeric color/size IDs because no reference-list
  endpoint exists. Image administration stores URL/path references; uploads
  are not supported.
- Admin `SaleDto` does not return eligible product IDs even though the update
  request requires them. The frontend can create, activate/deactivate, and
  delete promotions, but does not offer an unsafe edit that could replace
  product eligibility.
- Customer order cancellation, legal policy text, and contact details are not
  supplied by the current API/store configuration. Policy pages are explicitly
  editable placeholders, not published promises.

See `../docs/frontend-api-contract.md` and
`../docs/frontend-integration-audit.md` for the endpoint mapping and verification
status.

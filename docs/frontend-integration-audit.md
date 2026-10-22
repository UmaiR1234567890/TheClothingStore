# Frontend Integration Audit

## Implementation status

The Angular 18 client uses typed `HttpClient` services and the existing
`/api/v1` ASP.NET Core API. It is not a static catalog or a local mock: product,
price, availability, cart, checkout, order, customer, payment, shipment, and
admin data are rendered from API responses. Failed API calls remain visible as
error states instead of switching to sample data.

| Area | Frontend integration |
| --- | --- |
| Public departments/categories | Departments, hierarchical department categories, category detail, and category product routes |
| Catalog | Product query, search, sale/new/featured collections, URL filters, server sorting, and pagination |
| Product detail | Color-specific/shared image galleries, attributes, variant identity/options, effective/regular prices, availability, server add-to-cart |
| Cart | Guest cookie/authenticated cart, add/update/remove/clear, server totals, guest-cart merge after login |
| Authentication | Register/login/current-user/logout, backend roles, protected routes, password change |
| Customer account | Profile and address CRUD/default address, order history/detail/tracking |
| Checkout | Guest and saved-address flows, COD only, server validation, UUID idempotency key, server-confirmed result |
| Newsletter | Subscribe/unsubscribe |
| Admin | Dashboard, product/category/attribute/variant/image references, sale creation/status, inventory, order transitions, COD collection, shipments, customer status |
| Supporting pages | Not found, unauthorized, and clearly identified editable information/policy placeholders |

## Known API gaps and frontend behavior

- Identity tables and a development Admin account are provisioned in the local
  database. Admin login and protected read routes were smoke-tested; the
  frontend does not run migrations or create users in other environments.
- Password reset endpoints return 503 until email delivery is configured. The
  UI sends real requests and shows the server error; it never reports a fake
  reset success.
- COD is the only payment method. The frontend does not collect card data,
  simulate a payment provider, or add refund controls. Admin COD capture
  requires a reason and server confirmation.
- Shipping and tax currently calculate to zero in backend configuration. The
  checkout summary uses the validation response and does not calculate a
  trusted payable total locally.
- There is no wishlist endpoint, customer order-cancellation endpoint, or
  public size/color reference/facet endpoint. Wishlist and customer
  cancellation are omitted. Admin image upload accepts JPEG/PNG/WebP files up
  to 8 MB, assigns an optional `colorId`, and supports up to five images per
  product/color. Uploaded files go to the configured local image directory;
  the development proxy sends `/images/products/*` to the API's static file
  route. Production must serve the same relative path from persistent storage.
  Admin variant forms use protected color/size lookup endpoints.
- Cart lines do not include an image URL or product slug. Cart rows use a
  branded non-product placeholder rather than guessing a catalog image.
- Existing `SaleDto` records do not include eligible product IDs, so
  the frontend avoids updating existing sale eligibility. It still supports
  creating, enabling/disabling, and deleting promotions.
- Legal/policy/contact details were not supplied. Supporting pages explicitly
  say that approved store content is pending; they do not promise shipping
  timelines, returns, refunds, or legal terms.

## Security and data handling

- The JWT is held in `sessionStorage` (tab-session persistence, still
  accessible to scripts in the origin). No refresh endpoint exists, so an
  expired session requires sign-in. Logout clears client state but the
  backend does not revoke the token before its expiry. Checkout also stores
  only its UUID idempotency key in session storage after validation; if the
  order response is uncertain, the page blocks resubmission rather than
  creating a new key.
- The interceptor sends Bearer tokens only to protected API paths and sends
  cookies only to same-origin API requests. Public catalog requests do not
  receive the token. A token-bearing 401 clears the local token; 403 does not
  automatically log the user out.
- No passwords, database credentials, JWT signing keys, or payment secrets are
  configured in Angular. Templates do not use `innerHTML` or Angular
  sanitization bypasses.
- Prices, stock, discounts, checkout totals, account roles, and status
  transitions are revalidated by the backend.

## Verification

- Production build: `npm run build` passed. Initial bundle: 317.13 kB raw,
  below the configured 500 kB warning budget; lazy feature chunks are emitted.
- Unit tests: `npm test -- --watch=false --browsers=ChromeHeadless` passed
  (21 tests), including selected-color gallery/fallback behavior. Service tests
  use `HttpTestingController`.
- Backend verification: solution build passed with temporary output; 14 unit
  and 5 integration tests passed. The standard output path was locked by the
  Visual Studio API process, which was left running.
- Before the content reset, live read-only API smoke passed against the local
  development API:
  `/health/ready`, `/departments`, `/categories`, `/products`,
  `/products/featured`, `/products/new-arrivals`, `/products/on-sale`, and
  `/sales/active` all returned HTTP 200 with successful envelopes. Page and
  collection responses contained items; these catalog requests were read-only.
- The local reset script was subsequently executed with reference data retained.
  Product, variant, inventory, image-reference, customer, cart, order, payment,
  shipment, newsletter, and audit tables are now empty. The Admin login and
  reference data remain; physical image files were not deleted.
- After reset, Admin login still returns the `Admin` role. Dashboard, colors,
  and sizes endpoints return HTTP 200; the Admin product list is empty as
  expected. Earlier product/image upload and guest-cart flows passed API smoke
  tests, and their database test records were cleared by the reset. No new
  order or payment was created.
- Lint: not configured in this workspace.
- E2E and responsive screenshot automation: not configured. Use the checklist
  below for a safe test environment.

## Manual end-to-end checklist

Use a safe development/test database and test accounts. Do not place a real
order or payment.

1. Load the homepage; confirm API loading/error states and server-backed
   departments/new arrivals/most-ordered/on-sale sections.
2. Navigate Men, Women, and Kids; open a category; search; apply/clear price,
   sale, availability, volume, and attribute filters; change sort and page.
3. Open a product; verify images/fallback, attributes, variant-specific price
   and stock; add a valid variant; reject unavailable variants.
4. View the guest cart; update quantity, remove an item, and clear the bag.
5. Use the provisioned local Admin for protected dashboard/product/image
   management; test customer registration, profile, guest-cart merge, password
   change, addresses, and logout separately if those flows are in scope.
6. Validate guest COD checkout without placing an order, then complete only in
   an isolated test database. Confirm the server response is the only success
   state and retry with the same idempotency key if the outcome is uncertain.
7. Verify order history, snapshot details, payment state, and tracking only
   with backend-created test data.
8. Verify unauthorized admin routes, authorized admin role access, product,
   variant, image-reference, category, promotion, inventory, order, COD
   collection, shipment, and customer operations in a test environment.
9. Test unavailable API behavior and responsive layouts at mobile, tablet, and
   desktop widths.

## Dependency audit note

The final `npm audit --json` reported 64 vulnerabilities in the installed tree
(7 low, 16 moderate, 39 high, 2 critical). The advisory report includes direct
Angular runtime packages (`@angular/common`, `compiler`, `core`, and `router`)
as well as CLI/build/test dependencies; it also lists two critical transitive
build-tool advisories. The registry's `npm audit --omit=dev` request returned
HTTP 400, so a separate production-only report could not be obtained. The
reported Angular fixes require a major upgrade, which would violate the
explicit Angular 18 requirement; no force fix or framework upgrade was run.
This build is not suitable for public production deployment until the user
approves a supported Angular upgrade and the resulting dependency audit is
reviewed.

# API Endpoints

All routes are under `/api/v1`. Successful application responses use:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Failures include `success: false`, a safe message, and an `errors` array with
`code` and `message`. Paginated `data` contains `items`, `pageNumber`,
`pageSize`, `totalCount`, and `totalPages`.

## Health

| Method | Route | Access | Response |
| --- | --- | --- | --- |
| GET | `/health` | Public | Liveness status |
| GET | `/health/ready` | Public | SQL connectivity; returns 503 if unavailable |

## Authentication

| Method | Route | Access | Request / result |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public, rate limited | `email`, `password`, `firstName`, `lastName`, optional `phone`; returns token and user |
| POST | `/auth/login` | Public, rate limited | `email`, `password`; generic invalid-credential response |
| POST | `/auth/logout` | Authenticated | Client discards token; server does not revoke JWT |
| GET | `/auth/me` | Authenticated | Current Identity ID, email, optional customer ID, roles |
| POST | `/auth/forgot-password` | Public, rate limited | `email`; 503 until email delivery is configured |
| POST | `/auth/reset-password` | Public, rate limited | `email`, `token`, `newPassword`; 503 until email delivery is configured |
| POST | `/auth/change-password` | Authenticated | `currentPassword`, `newPassword` |

Tokens expire after 15 minutes. No refresh token or revocation list exists.
Identity endpoints require the additive Identity migration to be applied by an
operator first.

## Public departments and categories

| Method | Route | Query / result |
| --- | --- | --- |
| GET | `/departments` | Active departments |
| GET | `/departments/{id}` | Active department |
| GET | `/departments/{slug}/categories` | Active department categories |
| GET | `/categories` | Optional `departmentId` |
| GET | `/categories/{id}` | Category by ID |
| GET | `/categories/slug/{slug}` | Category by slug; slugs are unique only within a department, so the lowest department ID match is returned |
| GET | `/categories/{id}/children` | Active direct children |
| GET | `/categories/{id}/products` | Paginated active products |

## Public catalog and pricing

| Method | Route | Query / result |
| --- | --- | --- |
| GET | `/products` | Filterable, paginated product cards |
| GET | `/products/search` | Same query model as `/products`; use `search` |
| GET | `/products/{id}` | Active product details, images, categories, attributes, active variants |
| GET | `/products/slug/{slug}` | Product details by slug |
| GET | `/products/featured` | Best-selling products, derived from non-cancelled order lines (no stored featured flag exists) |
| GET | `/products/new-arrivals` | Newest active products |
| GET | `/products/on-sale` | Products with active eligible sales |
| GET | `/products/{productId}/variants` | Active variants belonging to that product |
| GET | `/variants/{id}` | Active variant and current effective price |
| GET | `/variants/{id}/availability` | Available stock quantity |
| GET | `/sales/active` | Current active sales |
| GET | `/sales/{id}` | Active sale |

Product query parameters:

| Parameter | Meaning |
| --- | --- |
| `department` | Department slug |
| `category` | Category slug |
| `search` | Product name, brand, or description |
| `minPrice`, `maxPrice` | Effective variant-price range |
| `colorId`, `sizeId`, `volumeMl` | Variant option filters |
| `attribute` | One `slug:value` descriptive attribute filter |
| `onSale`, `available` | Boolean eligibility / stock filters |
| `sortBy` | `newest`, `name`, `price-asc`, `price-desc`, `popular` |
| `pageNumber`, `pageSize` | Page starts at 1; page size 1-100 |

Filters and pagination run server-side. Inactive and soft-deleted products and
variants are excluded from public responses.

## Customer profile and addresses

| Method | Route | Access |
| --- | --- | --- |
| GET | `/customers/me` | Own customer profile |
| PUT | `/customers/me` | Update first name, last name, phone |
| GET | `/customers/me/addresses` | Own addresses |
| GET | `/customers/me/addresses/{id}` | Own address only |
| POST | `/customers/me/addresses` | Create address |
| PUT | `/customers/me/addresses/{id}` | Update own address |
| DELETE | `/customers/me/addresses/{id}` | Soft-delete own address |
| PATCH | `/customers/me/addresses/{id}/default` | Set both default shipping and billing flags |

## Carts and checkout

| Method | Route | Access / behavior |
| --- | --- | --- |
| GET | `/cart` | Guest or authenticated persisted cart |
| POST | `/cart/items` | `productVariantId`, `quantity`; validates activity and stock |
| PUT | `/cart/items/{id}` | Update quantity |
| DELETE | `/cart/items/{id}` | Remove line |
| DELETE | `/cart/items` | Clear cart |
| POST | `/cart/merge` | Authenticated; merges guest cookie cart transactionally |
| POST | `/checkout/validate` | Recalculates current prices, shipping, tax and available stock |
| POST | `/checkout` | Transactional COD checkout; accepts `Idempotency-Key` header or request `idempotencyKey` |

Guests use an HTTP-only `tcs.guest-cart` cookie; the backend creates the GUID
token. Checkout requests use a saved `shippingAddressId` for customers, or
`guestEmail` and `guestShippingAddress` for guests. Client-supplied totals are
ignored. COD payment remains Pending until admin confirmation. Shipping/tax
are zero in this initial configuration.

## Customer orders and payments

| Method | Route | Access / behavior |
| --- | --- | --- |
| GET | `/orders` | Own paginated orders; optional `status` |
| GET | `/orders/{id}` | Own order snapshots |
| GET | `/orders/{id}/tracking` | Own shipment snapshots |
| GET | `/orders/{orderId}/payment` | Own payment only |
| POST | `/orders/{orderId}/payment/initiate` | COD only; no external provider |
| POST | `/payments/{paymentId}/status` | Admin only; records COD collected with a reason; does not accept arbitrary provider status |

## Newsletter

| Method | Route | Request |
| --- | --- | --- |
| POST | `/newsletter/subscribe` | `email` |
| POST | `/newsletter/unsubscribe` | `email` |

Subscription state is persisted. No email is sent.

## Administrator routes

All `/admin` endpoints require the Identity role `Admin`. There is no public
endpoint to grant roles.

| Method | Route | Purpose |
| --- | --- | --- |
| GET, POST | `/admin/products` | Search/list and create products |
| GET, PUT, PATCH, DELETE | `/admin/products/{id}` | Product detail, update, `/status`, soft delete |
| POST | `/admin/products/{productId}/variants` | Create variant and zero-stock inventory row |
| PUT, PATCH | `/admin/variants/{id}` | Update variant or `/status` |
| POST | `/admin/products/{productId}/images` | Add image URL/path |
| PUT, DELETE, PATCH | `/admin/images/{id}` | Update, delete, or `/primary` |
| GET, POST | `/admin/departments` | List/create |
| PUT, PATCH | `/admin/departments/{id}` | Update or `/status` |
| GET, POST | `/admin/categories` | List/create |
| PUT, PATCH, DELETE | `/admin/categories/{id}` | Update, `/status`, soft delete |
| GET, POST | `/admin/attributes` | List/create descriptive attribute definitions |
| PUT, PATCH | `/admin/attributes/{id}` | Update definition or `/status` |
| GET, POST | `/admin/sales` | List/create promotion |
| PUT, PATCH, DELETE | `/admin/sales/{id}` | Update, `/status`, soft delete |
| GET | `/admin/inventory` | Paginated inventory, optional `search` |
| GET | `/admin/inventory/{variantId}` | Inventory for a variant |
| POST | `/admin/inventory/adjustments` | `productVariantId`, signed `quantityChange`, required `reason` |
| GET | `/admin/inventory/transactions` | Paginated ledger; optional `variantId` |
| GET | `/admin/orders` | Paginated orders; optional `status` |
| GET, PATCH | `/admin/orders/{id}` | Details and `/status` transition |
| GET | `/admin/payments` | Paginated payment records |
| GET | `/admin/payments/{id}` | Payment details |
| GET, POST | `/admin/shipments` | List/create Pending shipment |
| PUT, PATCH | `/admin/shipments/{id}` | Update fields or `/status` transition |
| GET | `/admin/customers` | Paginated minimal customer data |
| GET, PATCH | `/admin/customers/{id}` | Details and `/status` |
| GET | `/admin/dashboard/summary` | Persisted product/customer/order/captured-revenue counts |

Admin changes to products, variants, images, departments, categories,
attributes, sales, inventory, orders, payments, shipments, and customer status
are audited. Image endpoints manage references only; they do not upload or
store image files.

## Request field details

- `RegisterRequest`: `email`, `password`, `firstName`, `lastName`, optional
  `phone`. Password minimum is 10 characters and Identity also requires upper,
  lower, digit, and non-alphanumeric characters.
- `LoginRequest`: `email`, `password`.
- `ChangePasswordRequest`: `currentPassword`, `newPassword`.
- `ResetPasswordRequest`: `email`, `token`, `newPassword`; currently unavailable
  until a mail provider is configured.
- `CustomerProfileUpdateRequest`: `firstName`, `lastName`, optional `phone`.
- `AddressWriteRequest`: `fullName`, `line1`, optional `line2`, `city`,
  optional `region`, `postalCode`, `country` (default `Pakistan`), `phone`,
  `isDefaultShipping`, `isDefaultBilling`.
- `AddCartItemRequest`: `productVariantId`, `quantity` (1-100).
- `UpdateCartItemRequest`: `quantity` (1-100).
- `CheckoutRequest`: `guestEmail` and `guestShippingAddress` for guests, or
  `shippingAddressId` for customers; `paymentMethod` (`COD` only); required
  non-empty `idempotencyKey` GUID. The `Idempotency-Key` request header, when
  present, takes precedence. Guest address fields are `fullName`, `line1`,
  `city`, `region`, `postalCode`, and `country`.
- `ProductWriteRequest`: `name`, `slug`, `description`, `brand`, `status`
  (`Draft`, `Active`, `Inactive`), `departmentIds`, `categoryIds`, and
  `attributes` entries (`slug`, `value`).
- `VariantWriteRequest`: `sku`, optional `colorId`, `sizeId`, `volumeMl`,
  `regularPrice`, and `isActive`. Perfume variants use volume and cannot also
  specify color/size.
- `ProductImageWriteRequest`: `imageUrl` (HTTP(S) URL or local absolute path),
  `altText`, `displayOrder`, `isPrimary`.
- `DepartmentWriteRequest`: `name`, `slug`, `sortOrder`.
- `CategoryWriteRequest`: `departmentId`, optional `parentCategoryId`, `name`,
  `slug`, `sortOrder`.
- `ProductAttributeDefinitionWriteRequest`: `name`, `slug`. Attribute values
  remain product-level descriptive values in the product request.
- `SaleWriteRequest`: `name`, `discountType`, `discountValue`, optional
  `startsAt`/`endsAt`, and non-empty `productIds`. Percentage discounts are
  greater than zero through 100; fixed discounts are greater than zero.
- `InventoryAdjustmentRequest`: `productVariantId`, signed `quantityChange`,
  and required `reason`.
- `ShipmentWriteRequest`: `orderId`, `carrier`, `trackingNumber`, `status`.
  New shipments must start `Pending`.
- `StatusUpdateRequest`: `status`; each endpoint validates its own supported
  statuses/transitions.
- `PaymentStatusUpdateRequest`: `status` must be `Captured` and a required
  `reason`; this admin-only operation records COD collection, not an online
  provider callback.

## Response details

- Registration/login return `AuthTokenDto`: `accessToken`, `tokenType`,
  `expiresInSeconds`, and a user object with Identity ID, email, optional
  `customerId`, and role names.
- Admin product cards include lifecycle status and soft-delete state;
  department/category DTOs include active/deleted state; payment and shipment
  DTOs include their parent order ID.
- Product lists return `ProductCardDto`; product detail adds category,
  department, image, descriptive attribute, and purchasable variant DTO arrays.
- Cart and order responses expose server-calculated prices and totals. Order
  lines return the stored historical name, SKU, variant text, quantity, price,
  and discount snapshots.
- Checkout validation returns `isValid`, `errors`, `subtotal`, `discount`,
  `shipping`, `tax`, and `total`. Checkout returns the persisted order and
  payment status. It never accepts a client-supplied total.
- Validation failures use HTTP 400; resource conflicts and insufficient stock
  use 409; missing owned resources return 404; unauthenticated and
  unauthorized requests return 401/403; unexpected errors return a generic
  500 with a trace reference.

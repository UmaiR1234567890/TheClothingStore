# Frontend API Contract

Inspected from the backend controllers/DTOs and the running Development
OpenAPI document at `/swagger/v1/swagger.json`. Base path is `/api/v1`; the
OpenAPI document declares Bearer security per protected operation. Public
operations do not require a token. Monetary JSON numbers are PKR amounts by
the database design; the API does not return a separate currency code.

## Common response shapes

Normal responses use:

```ts
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors?: { code: string; message: string }[] | null;
}
```

Paginated data:

```ts
interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
```

Authentication/authorization responses use the same error envelope. Validation
is `400`, conflicts/stock errors are `409`, missing resources are `404`,
unauthenticated requests are `401`, forbidden requests are `403`, throttling is
`429`, and unexpected errors return a safe `500` response. DELETE operations
return `204` where indicated below.

## Authentication

All request/response models are JSON unless noted.

| Method / route | Access | Request | Response |
| --- | --- | --- | --- |
| POST `/auth/register` | Public, 10/min/IP | `RegisterRequest`: `email`, `password`, `firstName`, `lastName`, optional `phone` | `ApiResponse<AuthTokenDto>`; 201 |
| POST `/auth/login` | Public, 10/min/IP | `LoginRequest`: `email`, `password` | `ApiResponse<AuthTokenDto>`; 200 |
| POST `/auth/logout` | Bearer | none | `ApiResponse<object>`; token is not revoked, client discards it |
| GET `/auth/me` | Bearer | none | `ApiResponse<AuthUserDto>` |
| POST `/auth/forgot-password` | Public, 10/min/IP | `PasswordEmailRequest`: `email` | 503 until email delivery is configured |
| POST `/auth/reset-password` | Public, 10/min/IP | `ResetPasswordRequest`: `email`, `token`, `newPassword` | 503 until email delivery is configured |
| POST `/auth/change-password` | Bearer | `ChangePasswordRequest`: `currentPassword`, `newPassword` | `ApiResponse<object>` |

`AuthTokenDto` fields: `accessToken`, `tokenType`, `expiresInSeconds`, `user`.
`user` contains `userId`, `email`, nullable `customerId`, and `roles[]`.
Access tokens are short-lived JWT Bearer tokens; no refresh-token endpoint
exists.

## Health, departments, and categories

| Method / route | Access | Parameters/body | Response |
| --- | --- | --- | --- |
| GET `/health` | Public | none | `ApiResponse<object>` |
| GET `/health/ready` | Public | none | `ApiResponse<object>`; 503 if SQL connectivity fails |
| GET `/departments` | Public | none | `ApiResponse<DepartmentDto[]>` |
| GET `/departments/{id}` | Public | path `id` | `ApiResponse<DepartmentDto>` or 404 |
| GET `/departments/{slug}/categories` | Public | path `slug` | `ApiResponse<CategoryDto[]>` |
| GET `/categories` | Public | query `departmentId?` | `ApiResponse<CategoryDto[]>` |
| GET `/categories/{id}` | Public | path `id` | `ApiResponse<CategoryDto>` or 404 |
| GET `/categories/slug/{slug}` | Public | path `slug` | `ApiResponse<CategoryDto>` or 404; chooses lowest DepartmentId if slugs collide between departments |
| GET `/categories/{id}/children` | Public | path `id` | `ApiResponse<CategoryDto[]>` |
| GET `/categories/{id}/products` | Public | path `id`, query `pageNumber=1`, `pageSize=20` | `ApiResponse<PagedResult<ProductCardDto>>` |

`DepartmentDto`: `departmentId`, `name`, `slug`, `sortOrder`, `isActive`.
`CategoryDto`: `categoryId`, `departmentId`, nullable `parentCategoryId`,
`name`, `slug`, `sortOrder`, `productCount`, `isActive`, `isDeleted`.

## Catalog, variants, and sales

| Method / route | Access | Parameters/body | Response |
| --- | --- | --- | --- |
| GET `/products` | Public | product query parameters below | `ApiResponse<PagedResult<ProductCardDto>>` |
| GET `/products/search` | Public | same product query; use `Search` | `ApiResponse<PagedResult<ProductCardDto>>` |
| GET `/products/{id}` | Public | path `id` | `ApiResponse<ProductDetailDto>` or 404 |
| GET `/products/slug/{slug}` | Public | path `slug` | `ApiResponse<ProductDetailDto>` or 404 |
| GET `/products/featured` | Public | query `pageNumber=1`, `pageSize=20` | paginated product cards; best-seller ranking because no featured column exists |
| GET `/products/new-arrivals` | Public | query `pageNumber=1`, `pageSize=20` | paginated product cards |
| GET `/products/on-sale` | Public | query `pageNumber=1`, `pageSize=20` | paginated product cards |
| GET `/products/{productId}/variants` | Public | path `productId` | `ApiResponse<ProductVariantDto[]>` |
| GET `/variants/{id}` | Public | path `id` | `ApiResponse<ProductVariantDto>` or 404 |
| GET `/variants/{id}/availability` | Public | path `id` | `ApiResponse<VariantAvailabilityDto>` |
| GET `/sales/active` | Public | none | `ApiResponse<SaleDto[]>` |
| GET `/sales/{id}` | Public | path `id` | `ApiResponse<SaleDto>` or 404 |

OpenAPI publishes product query keys as `Department`, `Category`, `Search`, `MinPrice`,
`MaxPrice`, `ColorId`, `SizeId`, `VolumeMl`, `Attribute`, `OnSale`, `Available`,
`SortBy`, `PageNumber`, and `PageSize`. `Attribute` accepts one `slug:value`.
ASP.NET Core model binding is case-insensitive, but the frontend should use
these published names. Sort values are `newest`, `name`, `price-asc`,
`price-desc`, `popular`.
Page size is 1-100. Filters/pagination execute on the server.

`ProductCardDto`: `productId`, `name`, `slug`, nullable `brand` and
`primaryImageUrl`, nullable `minPrice`/`maxPrice`, `onSale`, `isAvailable`.
`ProductDetailDto` includes product fields, `status`, `isDeleted`, `createdAt`,
categories, departments, images, attributes, and variants. `ProductImageDto`
includes nullable `colorId` and `colorName`; `null` denotes a shared
product-level image, while a color-specific image belongs to that color and
can be shown across all its size variants.
`ProductVariantDto`: `productVariantId`, `sku`, `options`, `isActive`,
`isDeleted`, `regularPrice`, `effectivePrice`, `onSale`,
`quantityAvailable`, `isAvailable`.
Options contain nullable color/size identifiers and names, size type, and
nullable perfume `volumeMl`.

## Customer, cart, and checkout

| Method / route | Access | Request/parameters | Response |
| --- | --- | --- | --- |
| GET `/customers/me` | Bearer customer | none | `ApiResponse<CustomerProfileDto>` |
| PUT `/customers/me` | Bearer customer | `firstName`, `lastName`, optional `phone` | customer profile |
| GET `/customers/me/addresses` | Bearer customer | none | `CustomerAddressDto[]` |
| GET `/customers/me/addresses/{id}` | Bearer customer | path `id` | address or 404 |
| POST `/customers/me/addresses` | Bearer customer | address fields in Swagger | address; 201 |
| PUT `/customers/me/addresses/{id}` | Bearer customer | path `id`, address fields | address |
| DELETE `/customers/me/addresses/{id}` | Bearer customer | path `id` | 204 |
| PATCH `/customers/me/addresses/{id}/default` | Bearer customer | path `id` | sets both default flags |
| GET `/cart` | Public guest or Bearer customer | guest identified by HTTP-only `tcs.guest-cart` cookie | `ApiResponse<CartDto>`; may set cookie |
| POST `/cart/items` | Guest/customer | `productVariantId`, `quantity` (1-100) | updated `CartDto` |
| PUT `/cart/items/{id}` | Guest/customer | path `id`, `quantity` | updated `CartDto` |
| DELETE `/cart/items/{id}` | Guest/customer | path `id` | 204 |
| DELETE `/cart/items` | Guest/customer | none | 204 |
| POST `/cart/merge` | Bearer customer | guest cookie | merged `CartDto`; clears guest cookie |
| POST `/checkout/validate` | Guest/customer | `CheckoutRequest` | `CheckoutValidationDto` |
| POST `/checkout` | Guest/customer | `CheckoutRequest`; optional `Idempotency-Key` GUID header overrides body key | 201 new order, 200 idempotent replay |

Customer address fields: `fullName`, `line1`, optional `line2`, `city`,
optional `region`, `postalCode`, `country`, optional `phone`,
`isDefaultShipping`, `isDefaultBilling`.

`CheckoutRequest`: `guestEmail?`, `shippingAddressId?`,
`guestShippingAddress?`, `paymentMethod` (`COD` only), `idempotencyKey` (UUID).
Guest shipping address: `fullName`, `line1`, `city`, `region`, `postalCode`,
`country`. Totals/prices are server-derived.

`CartDto`: `cartId`, `items[]`, `subtotal`, `totalQuantity`.
Cart lines include product/variant identity, current `unitPrice`, `lineTotal`,
quantity, current available quantity, and availability.
`CheckoutValidationDto`: `isValid`, `errors[]`, `subtotal`, `discount`,
`shipping`, `tax`, `total`.

## Orders, payment, shipments, newsletter

| Method / route | Access | Request/parameters | Response |
| --- | --- | --- | --- |
| GET `/orders` | Bearer customer | `pageNumber`, `pageSize`, `status?` | paginated own orders |
| GET `/orders/{id}` | Bearer customer | path `id` | own order snapshots or 404 |
| GET `/orders/{id}/tracking` | Bearer customer | path `id` | own order and shipments |
| GET `/orders/{orderId}/payment` | Bearer customer | path `orderId` | own payment or 404 |
| POST `/orders/{orderId}/payment/initiate` | Bearer customer | `method` (`COD`) | pending payment record |
| POST `/payments/{paymentId}/status` | Admin Bearer | `status: "Captured"`, required `reason` | records COD collection only |
| POST `/newsletter/subscribe` | Public | `email` | generic subscription status |
| POST `/newsletter/unsubscribe` | Public | `email` | generic unsubscribe status |

Orders return saved historical line snapshots. Payment fields include
`paymentId`, `orderId`, `amount`, `method`, `provider`, `providerReference`,
`status`, and timestamps. Shipment fields include `shipmentId`, `orderId`,
carrier, tracking number, status, and timestamps. No online payment provider or
webhook is configured.

## Admin

All `/admin/*` operations require the `Admin` Identity role.

| Methods / route | Request/result |
| --- | --- |
| GET, POST `/admin/products` | Paginated admin product cards; create with `ProductWriteRequest` |
| GET, PUT `/admin/products/{id}` | Admin product details; update with `ProductWriteRequest` |
| PATCH, DELETE `/admin/products/{id}/status` or `/admin/products/{id}` | Status is Active/Draft/Inactive; DELETE soft-deletes |
| POST `/admin/products/{productId}/variants`; PUT/PATCH `/admin/variants/{id}` | `VariantWriteRequest`; `/status` accepts Active/Inactive |
| GET `/admin/colors`; GET `/admin/sizes` | Active reference data for variant dropdowns |
| POST `/admin/products/{productId}/images/upload` | Multipart `file` plus `altText`, optional `colorId`, `displayOrder`, and `isPrimary`; JPEG/PNG/WebP up to 8 MB |
| POST `/admin/products/{productId}/images`; PUT/DELETE/PATCH `/admin/images/{id}` | URL/path reference management; optional `colorId` assigns a color gallery; up to five images per product/color; `/primary` selects the group's primary |
| GET, POST `/admin/departments`; PUT/PATCH `/admin/departments/{id}` | `DepartmentWriteRequest`; `/status` accepts Active/Inactive |
| GET, POST `/admin/categories`; PUT/PATCH/DELETE `/admin/categories/{id}` | `CategoryWriteRequest`; soft delete; validates parent cycles |
| GET, POST `/admin/attributes`; PUT/PATCH `/admin/attributes/{id}` | `ProductAttributeDefinitionWriteRequest`; `/status` accepts Active/Inactive |
| GET, POST `/admin/sales`; PUT/PATCH/DELETE `/admin/sales/{id}` | `SaleWriteRequest`; `/status` accepts Active/Inactive |
| GET `/admin/inventory`; GET `/admin/inventory/{variantId}` | Paginated inventory/search and variant stock |
| POST `/admin/inventory/adjustments`; GET `/admin/inventory/transactions` | Adjustment requires variant, signed quantity, reason; transactions paginated |
| GET/PATCH `/admin/orders`; GET `/admin/orders/{id}` | List/detail/status transition |
| GET `/admin/payments`; GET `/admin/payments/{id}` | Admin payment records |
| GET/POST `/admin/shipments`; PUT/PATCH `/admin/shipments/{id}` | New shipment starts Pending; `/status` follows transition rules |
| GET `/admin/customers`; GET/PATCH `/admin/customers/{id}` | Minimal customer details; `/status` accepts Active/Inactive |
| GET `/admin/dashboard/summary` | Actual product/customer/pending-order/captured-revenue aggregates |

OpenAPI is generated from actual controllers and DTOs. Its JWT Bearer requirement
is applied per `[Authorize]` endpoint; it does not mark public routes protected.

## Frontend implementation notes

- `CartLineDto` contains product name/SKU, variant options, quantity, current
  prices, available quantity, and availability, but no product slug or image
  URL. The frontend therefore uses a neutral branded placeholder in cart rows.
- Product filters accept `ColorId` and `SizeId`, but the API exposes no public
  color/size lookup or facet endpoint. The frontend does not invent those
  reference values; shoppers choose valid options on product detail pages.
- `SaleDto` omits eligible product IDs although `SaleWriteRequest` requires
  them. The frontend can create promotions and change status, but does not
  overwrite an existing sale's eligibility without the server returning that
  information.
- Product image uploads store files in the configured product image directory
  and persist relative URL references. The API does not serve local files;
  Angular or the deployment's static-file host must serve `/images/*`.
- There is no wishlist endpoint or customer order-cancellation endpoint.
- Identity tables and a development Admin account are provisioned in the local
  database. Other environments require the additive Identity schema and
  environment-specific user/role provisioning.
- Password-reset requests return 503 until email delivery is configured. COD
  is the only payment method; shipping and tax are currently zero in backend
  configuration.

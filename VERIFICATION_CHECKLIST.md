# Clothing Store — Verification Checklist

Use this list to click through every change. Tick items off as you verify.
If something fails, note the page + what happened and tell me.

Prereqs:
- SQL script `database/scripts/20_carriers_and_sale_scopes.sql` already applied (Carriers + SaleScopes tables).
- API running on http://127.0.0.1:5077 (restart it to pick up latest code).
- Angular running on http://localhost:4200.
- Admin login: superadmin@theclothingstore.local

---

## A. Admin — Products

- [ ] `/admin/products` — action pills: Edit, Variants, Images, Promote, Soft delete (red). Layout looks clean.
- [ ] Search on products page works (URL does NOT become `/admin/products?` — no empty native submit).
- [ ] **Promote button** — opens a popup listing active promotions. Click "Attach" → product joins that sale. "Create a new promotion" link in modal goes to `/admin/sales?promote=<id>` prefilled.
- [ ] `/admin/products/new` (add/edit) — attribute chips render nicely with display names + hover-danger Remove.

## B. Admin — Variants

- [ ] `/admin/products/<id>/variants` — bulk builder shows color chips (multi-select) + "No color".
- [ ] Each selected color expands its own size chip group with per-color **All / None**.
- [ ] Top of colors row: **All colors**, **None**, **All sizes in every color** buttons work.
- [ ] SKU base + auto SKU naming `BASE-COLOR-SIZE`; duplicates get `-2` suffixes.
- [ ] Starting stock per variant applies; stock editable while editing a variant; inline stock setter on each table row saves via inventory adjustment.

## C. Admin — Images

- [ ] `/admin/products/<id>/images` — file input accepts **multiple files** (browse or drag/drop).
- [ ] Selected files queue shows thumbnails, sizes, "First = primary" badge; individual Remove + Clear all.
- [ ] After upload: first image is primary (only one primary); "Set primary" changes it; Remove buttons styled red.
- [ ] Each image card shows color badge + associated sizes.

## D. Admin — Orders

- [ ] `/admin/orders` — status filter dropdown, colored status badges, order numbers wrap (no overflow).
- [ ] `/admin/orders/<id>` — long order number wraps in title; **items table shows Product / Variant / SKU / Qty / Unit price / Line total**.
- [ ] Status buttons follow the lifecycle: Pending → Paid/Processing/Cancelled; Processing → Paid/Shipped/Cancelled; Shipped → Completed/Returned; Completed → Returned; Returned → Refunded/Cancelled.
- [ ] **Auto-progress**: mark a shipment Packed/Shipped → order moves to Processing/Shipped automatically.
- [ ] **Auto-complete**: Delivered shipment + captured payment → order becomes Completed automatically (no manual click needed).
- [ ] Record COD collection on an already-delivered order → order becomes Completed.
- [ ] Cancelling/returning restores stock once (check Inventory — Returned → Refunded must NOT double-restore).

## E. Admin — Payments

- [ ] `/admin/payments` — search box filters by **order number** (e.g. TCS2610…), also order id / payment id / provider ref.
- [ ] "Record collection" on pending COD → opens the **modal popup**; requires a reason (≥3 chars); success message shows order number.
- [ ] **Refund** button on Captured payments → modal → confirms → payment Refunded, order → Refunded, stock restored. Check Inventory afterwards.

## F. Admin — Shipments

- [ ] `/admin/shipments` — table shows order **numbers** (links to order detail), carrier, tracking, status badges, dates.
- [ ] Create shipment: **search input** for order (type order number / id / customer email → click match; "Change" clears).
- [ ] Carrier is a **dropdown** (TCS Courier, Leopards, M&P, Pakistan Post, CallCourier, DHL, FedEx, self-delivery).
- [ ] **Generate** button auto-fills tracking number like `TCS-260102…-####`.
- [ ] Next-step dropdown per row: Pending → Packed → Shipped → Delivered | Returned (no InTransit).
- [ ] Marking Shipped/Delivered updates the ORDER status automatically (see D).

## G. Admin — Promotions

- [ ] `/admin/sales` — New promotion: name, discount type/value, datetime calendar pickers.
- [ ] Step 1 department (All Departments / Men / Women / Kids) → Step 2 category filtered by dept (All Categories option) → Step 3 "All items in selection" vs "Specific items" → Step 4 searchable product tile grid + Select all shown + selected chips.
- [ ] Save → promotion appears in list with scope label (Entire store / N departments / N categories / N products).
- [ ] Edit a promotion → pre-fills name, discount, dates, scope.
- [ ] Scoped sale actually discounts products: check storefront listing after creating a dept/category sale.

## H. Storefront — Listing & Detail

- [ ] `/products` — filter panel toggleable on desktop (show/hide button, animated chevron); filters send query params correctly.
- [ ] On-sale product cards show **sale price + struck-through regular price**.
- [ ] `/products/<slug>` — sale banner shows promotion name + **countdown** ("ends in Xd Xh"); regular vs effective price.
- [ ] Cart/checkout prices match effective (sale) price.

## I. Checkout & Orders (customer side)

- [ ] Checkout produces **short order number** like `TCS261024182910-AF62DFA7`.
- [ ] Order confirmation email arrives in Mailtrap inbox with branded HTML (items, totals, address).
- [ ] `/account/orders/<id>` — for Cancelled/Returned/Refunded orders, **Back to bag** button re-adds items to cart and navigates to `/cart`.
- [ ] `/account/orders/<id>/tracking` — progress timeline: Shipment created → Packed → Shipped → Delivered (+ Returned branch); carrier, tracking number, dates shown.

## J. Inventory & Misc

- [ ] `/admin/inventory` — search sends the term (no bare `?` URL).
- [ ] Refund/cancel/return stock restore appears in Inventory transactions.
- [ ] Order numbers on every admin page wrap safely (no horizontal overflow).

---

### Known test data (from my E2E run — safe to delete)
- Sale "E2E Scope Test" (20% off all Men products, active until ~7 days from setup).
- Order `TCS261024182910-AF62DFA7` (guest checkout to mailinator, has email + COD payment).
- Test order `TCS261024195052-EF8DA886` you placed yourself.

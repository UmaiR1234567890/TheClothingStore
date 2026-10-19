import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CartDto, CheckoutRequest, CheckoutResultDto, CheckoutValidationDto, CustomerAddressDto } from '../../core/models/commerce.models';
import { CartApiService } from '../../core/services/cart-api.service';
import { CartStateService } from '../../core/services/cart-state.service';
import { CheckoutApiService } from '../../core/services/checkout-api.service';
import { CustomerApiService } from '../../core/services/customer-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

const PENDING_CHECKOUT_KEY = 'tcs.pending-checkout-key';

@Component({
  selector: 'tcs-checkout-page',
  standalone: true,
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  template: `
    <section class="checkout-page container">
      @if (result(); as completed) {
        <div class="checkout-success">
          <div class="checkout-success__mark" aria-hidden="true">✓</div>
          <p class="eyebrow">Order received</p>
          <h1 class="page-title">Thank you.</h1>
          <p class="page-intro">Your order <strong>{{ completed.order.orderNumber }}</strong> was placed.</p>
          <div class="checkout-success__summary">
            <span>Order status <strong>{{ completed.order.status }}</strong></span>
            <span>Payment status <strong>{{ completed.paymentStatus }}</strong></span>
            <span>Total <strong>{{ completed.order.totalAmount | currency:'PKR':'code':'1.0-2' }}</strong></span>
          </div>
          @if (completed.order.orderId && isSignedIn()) {
            <a class="btn btn-primary" [routerLink]="['/account/orders', completed.order.orderId]">View order</a>
          } @else {
            <a class="btn btn-primary" routerLink="/">Continue browsing</a>
          }
        </div>
      } @else {
        <div class="checkout-heading">
          <div><p class="eyebrow">One last look</p><h1 class="page-title">Checkout.</h1></div>
          <a class="text-link" routerLink="/cart">Back to your bag</a>
        </div>

        @if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
        @if (cartLoading()) {
          <div class="state-panel"><span class="spinner" aria-label="Loading checkout"></span></div>
        } @else if (!cart() || cart()!.items.length === 0) {
          <div class="state-panel">
            <h2>Your bag is empty</h2><p>Add an available item before checkout.</p>
            <a class="btn btn-primary" routerLink="/">Explore the collection</a>
          </div>
        } @else {
          <div class="checkout-layout">
            <form class="checkout-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
              @if (isSignedIn()) {
                <section class="checkout-section">
                  <div class="checkout-section__heading"><span>01</span><div><h2>Delivery address</h2><p>Select one of your saved addresses.</p></div></div>
                  @if (addressError()) {
                    <div class="notice notice-error" role="alert">{{ addressError() }}</div>
                  } @else if (addresses().length === 0) {
                    <div class="notice">No saved addresses yet. <a routerLink="/account/addresses">Add an address</a> and return to checkout.</div>
                  } @else {
                    <div class="address-select-list">
                      @for (address of addresses(); track address.customerAddressId) {
                        <label class="address-select" [class.address-select--active]="form.controls.shippingAddressId.value === address.customerAddressId">
                          <input type="radio" formControlName="shippingAddressId" [value]="address.customerAddressId">
                          <span>
                            <strong>{{ address.fullName }}</strong>
                            <small>{{ address.line1 }}@if (address.line2) {, {{ address.line2 }}}, {{ address.city }}, {{ address.country }}</small>
                          </span>
                        </label>
                      }
                    </div>
                  }
                  @if (form.controls.shippingAddressId.touched && form.controls.shippingAddressId.invalid) {
                    <span class="field-error">Select a delivery address.</span>
                  }
                </section>
              } @else {
                <section class="checkout-section">
                  <div class="checkout-section__heading"><span>01</span><div><h2>Contact & delivery</h2><p>Guest checkout is available.</p></div></div>
                  <div class="field">
                    <label for="checkout-email">Email</label>
                    <input id="checkout-email" class="control" type="email" formControlName="guestEmail" autocomplete="email">
                    @if (form.controls.guestEmail.touched && form.controls.guestEmail.invalid) { <span class="field-error">Enter a valid email address.</span> }
                  </div>
                  <div class="field">
                    <label for="guest-name">Recipient name</label>
                    <input id="guest-name" class="control" formControlName="guestFullName" autocomplete="name">
                  </div>
                  <div class="field">
                    <label for="guest-line1">Address</label>
                    <input id="guest-line1" class="control" formControlName="guestLine1" autocomplete="address-line1">
                  </div>
                  <div class="checkout-form-grid">
                    <div class="field"><label for="guest-city">City</label><input id="guest-city" class="control" formControlName="guestCity" autocomplete="address-level2"></div>
                    <div class="field"><label for="guest-region">Province / region</label><input id="guest-region" class="control" formControlName="guestRegion" autocomplete="address-level1"></div>
                  </div>
                  <div class="checkout-form-grid">
                    <div class="field"><label for="guest-postal">Postal code</label><input id="guest-postal" class="control" formControlName="guestPostalCode" autocomplete="postal-code"></div>
                    <div class="field"><label for="guest-country">Country</label><input id="guest-country" class="control" formControlName="guestCountry" autocomplete="country-name"></div>
                  </div>
                </section>
              }

              <section class="checkout-section">
                <div class="checkout-section__heading"><span>02</span><div><h2>Payment</h2><p>Available payment method for this store.</p></div></div>
                <label class="payment-choice">
                  <input type="radio" checked disabled>
                  <span><strong>Cash on delivery</strong><small>Pay when your order is delivered.</small></span>
                  <span class="payment-choice__code">COD</span>
                </label>
              </section>

              @if (validation(); as checked) {
                <section class="checkout-section checkout-review">
                  <div class="checkout-section__heading"><span>03</span><div><h2>Server-checked total</h2><p>Prices and stock are revalidated by the store.</p></div></div>
                  @for (message of checked.errors; track message) { <p class="field-error">{{ message }}</p> }
                  <div class="checkout-total-row"><span>Subtotal</span><span>{{ checked.subtotal | currency:'PKR':'code':'1.0-2' }}</span></div>
                  <div class="checkout-total-row"><span>Discount</span><span>− {{ checked.discount | currency:'PKR':'code':'1.0-2' }}</span></div>
                  <div class="checkout-total-row"><span>Shipping</span><span>{{ checked.shipping | currency:'PKR':'code':'1.0-2' }}</span></div>
                  <div class="checkout-total-row"><span>Tax</span><span>{{ checked.tax | currency:'PKR':'code':'1.0-2' }}</span></div>
                  <div class="checkout-total-row checkout-total-row--grand"><strong>Total</strong><strong>{{ checked.total | currency:'PKR':'code':'1.0-2' }}</strong></div>
                </section>
              }

              <button class="btn btn-accent checkout-submit" type="submit" [disabled]="submitting() || outcomeUncertain() || cartHasUnavailable() || (isSignedIn() && addresses().length === 0)">
                {{ submitting() ? 'Checking your order…' : validation()?.isValid ? 'Place COD order' : 'Validate & place order' }}
              </button>
              @if (outcomeUncertain()) {
                <p class="notice notice-error" role="alert">
                  The previous order request may have reached the store. This page will not submit another order with a new key. Verify the order before continuing.
                </p>
              }
              @if (cartHasUnavailable()) {
                <p class="notice notice-error">Remove unavailable items from your bag before checkout.</p>
              }
            </form>

            <aside class="checkout-summary">
              <p class="eyebrow">Your bag</p>
              <h2>{{ cart()!.totalQuantity }} {{ cart()!.totalQuantity === 1 ? 'piece' : 'pieces' }}</h2>
              @for (line of cart()!.items; track line.cartItemId) {
                <div class="checkout-item">
                  <div><strong>{{ line.productName }}</strong><small>{{ line.sku }} · Qty {{ line.quantity }}</small></div>
                  <span>{{ line.lineTotal | currency:'PKR':'code':'1.0-2' }}</span>
                </div>
              }
              <p class="checkout-summary__note">This bag total is informational. The server confirms the final amount above.</p>
            </aside>
          </div>
        }
      }
    </section>
  `,
  styleUrl: './checkout-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPageComponent implements OnInit {
  readonly cart = signal<CartDto | null>(null);
  readonly addresses = signal<CustomerAddressDto[]>([]);
  readonly validation = signal<CheckoutValidationDto | null>(null);
  readonly result = signal<CheckoutResultDto | null>(null);
  readonly isSignedIn = signal(false);
  readonly cartLoading = signal(true);
  readonly submitting = signal(false);
  readonly outcomeUncertain = signal(false);
  readonly error = signal('');
  readonly addressError = signal('');
  private readonly idempotencyKey = signal<string>(crypto.randomUUID());
  readonly form = new FormGroup({
    shippingAddressId: new FormControl<number | null>(null),
    guestEmail: new FormControl('', { nonNullable: true, validators: [Validators.email, Validators.maxLength(256)] }),
    guestFullName: new FormControl('', { nonNullable: true }),
    guestLine1: new FormControl('', { nonNullable: true }),
    guestCity: new FormControl('', { nonNullable: true }),
    guestRegion: new FormControl('', { nonNullable: true }),
    guestPostalCode: new FormControl('', { nonNullable: true }),
    guestCountry: new FormControl('Pakistan', { nonNullable: true }),
  });

  constructor(
    private readonly auth: AuthService,
    private readonly carts: CartApiService,
    private readonly customers: CustomerApiService,
    private readonly checkout: CheckoutApiService,
    private readonly cartState: CartStateService,
  ) {
    const pendingKey = readPendingCheckoutKey();
    if (pendingKey) {
      this.idempotencyKey.set(pendingKey);
      this.outcomeUncertain.set(true);
      this.error.set('A previous checkout result is uncertain. Do not submit again until you verify the order.');
    }
  }

  ngOnInit(): void {
    this.isSignedIn.set(this.auth.hasAccessToken);
    if (this.isSignedIn()) {
      this.form.controls.shippingAddressId.addValidators(Validators.required);
      this.form.controls.guestEmail.clearValidators();
      this.form.controls.shippingAddressId.updateValueAndValidity();
      this.form.controls.guestEmail.updateValueAndValidity();
      this.customers.getAddresses().subscribe({
        next: (addresses) => {
          this.addresses.set(addresses);
          const defaultAddress = addresses.find((address) => address.isDefaultShipping);
          if (defaultAddress) {
            this.form.controls.shippingAddressId.setValue(defaultAddress.customerAddressId);
          }
        },
        error: (failure: unknown) => this.addressError.set(parseApiFailure(failure, 'Saved addresses could not be loaded.').message),
      });
    } else {
      this.form.controls.guestEmail.addValidators([Validators.required, Validators.email, Validators.maxLength(256)]);
      this.form.controls.guestFullName.addValidators(Validators.required);
      this.form.controls.guestLine1.addValidators(Validators.required);
      this.form.controls.guestCity.addValidators(Validators.required);
      this.form.controls.guestEmail.updateValueAndValidity();
      this.form.controls.guestFullName.updateValueAndValidity();
      this.form.controls.guestLine1.updateValueAndValidity();
      this.form.controls.guestCity.updateValueAndValidity();
    }
    this.carts.getCart().subscribe({
      next: (cart) => {
        this.cart.set(cart);
        this.cartState.setCount(cart.totalQuantity);
        this.cartLoading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Your bag could not be loaded.').message);
        this.cartLoading.set(false);
      },
    });
  }

  cartHasUnavailable(): boolean {
    return this.cart()?.items.some((line) => !line.isAvailable || line.quantity > line.quantityAvailable) ?? false;
  }

  submit(): void {
    this.error.set('');
    this.validation.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting() || this.cartHasUnavailable() || this.outcomeUncertain()) {
      return;
    }
    this.submitting.set(true);
    const request = this.toRequest();
    this.checkout.validate(request).subscribe({
      next: (validation) => {
        this.validation.set(validation);
        if (!validation.isValid) {
          this.submitting.set(false);
          return;
        }
        if (!persistPendingCheckoutKey(this.idempotencyKey())) {
          this.error.set('This browser cannot preserve checkout retry protection. Enable session storage before placing the order.');
          this.submitting.set(false);
          return;
        }
        this.checkout.placeOrder(request).subscribe({
          next: (result) => {
            this.result.set(result);
            clearPendingCheckoutKey();
            this.outcomeUncertain.set(false);
            this.cartState.setCount(0);
            this.cartState.refresh();
            this.submitting.set(false);
          },
          error: (failure: unknown) => {
            const parsed = parseApiFailure(failure, 'The order could not be placed.');
            if (parsed.status === 0 || parsed.status >= 500) {
              this.outcomeUncertain.set(true);
              this.error.set(`${parsed.message} The order outcome may be uncertain; do not retry blindly.`);
            } else {
              clearPendingCheckoutKey();
              this.error.set(parsed.message);
            }
            this.submitting.set(false);
          },
        });
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Checkout could not be validated.').message);
        this.submitting.set(false);
      },
    });
  }

  private toRequest(): CheckoutRequest {
    const value = this.form.getRawValue();
    return {
      guestEmail: this.isSignedIn() ? null : value.guestEmail.trim(),
      shippingAddressId: this.isSignedIn() ? value.shippingAddressId : null,
      guestShippingAddress: this.isSignedIn() ? null : {
        fullName: value.guestFullName.trim(),
        line1: value.guestLine1.trim(),
        city: value.guestCity.trim(),
        region: value.guestRegion.trim() || null,
        postalCode: value.guestPostalCode.trim() || null,
        country: value.guestCountry.trim(),
      },
      paymentMethod: 'COD',
      idempotencyKey: this.idempotencyKey(),
    };
  }
}

function readPendingCheckoutKey(): string | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  try {
    const key = sessionStorage.getItem(PENDING_CHECKOUT_KEY);
    return key && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)
      ? key
      : null;
  } catch {
    return null;
  }
}

function persistPendingCheckoutKey(key: string): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }
  try {
    sessionStorage.setItem(PENDING_CHECKOUT_KEY, key);
    return true;
  } catch {
    return false;
  }
}

function clearPendingCheckoutKey(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
  } catch {
    // No sensitive data is stored here; ignore unavailable session storage.
  }
}

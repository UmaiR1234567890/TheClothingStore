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
  templateUrl: './checkout-page.component.html',
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

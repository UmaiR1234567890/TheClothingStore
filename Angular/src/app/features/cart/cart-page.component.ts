import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartDto, CartLineDto } from '../../core/models/commerce.models';
import { CartApiService } from '../../core/services/cart-api.service';
import { CartStateService } from '../../core/services/cart-state.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-cart-page',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  template: `
    <section class="cart-page container">
      <div class="cart-heading">
        <div><p class="eyebrow">Your selection</p><h1 class="page-title">The bag.</h1></div>
        @if (cart()) { <span class="cart-heading__count">{{ cart()!.totalQuantity }} pieces</span> }
      </div>

      @if (message()) { <p class="notice notice-success" role="status">{{ message() }}</p> }
      @if (error()) {
        <div class="notice notice-error" role="alert">
          {{ error() }}
          <button class="text-button" type="button" (click)="load()">Try again</button>
        </div>
      }

      @if (loading()) {
        <div class="state-panel"><span class="spinner" aria-label="Loading bag"></span></div>
      } @else if (cart() && cart()!.items.length === 0) {
        <div class="cart-empty">
          <div class="cart-empty__seal" aria-hidden="true">TCS</div>
          <p class="eyebrow">Room for something considered</p>
          <h2>Your bag is taking a breather.</h2>
          <p>Explore the collection and find a piece for your everyday.</p>
          <a class="btn btn-primary" routerLink="/">Continue browsing</a>
        </div>
      } @else if (cart()) {
        <div class="cart-layout">
          <section class="cart-lines" aria-label="Items in your bag">
            @for (line of cart()!.items; track line.cartItemId) {
              <article class="cart-line">
                <div class="cart-line__image" aria-hidden="true">
                  <span>{{ productMark(line.productName) }}</span>
                </div>
                <div class="cart-line__details">
                  <h2>{{ line.productName }}</h2>
                  <p>{{ optionText(line) }}</p>
                  <span class="cart-line__sku">SKU {{ line.sku }}</span>
                  @if (!line.isAvailable) {
                    <span class="cart-line__stock" role="status">This variant is not currently available.</span>
                  } @else {
                    <span class="cart-line__stock">{{ line.quantityAvailable }} available</span>
                  }
                  <div class="cart-line__controls">
                    <div class="quantity-control">
                      <button type="button" [disabled]="line.quantity <= 1 || busyId() === line.cartItemId" (click)="changeQuantity(line, line.quantity - 1)" [attr.aria-label]="'Decrease quantity of ' + line.productName">−</button>
                      <output aria-label="Quantity">{{ line.quantity }}</output>
                      <button type="button" [disabled]="!line.isAvailable || line.quantity >= line.quantityAvailable || busyId() === line.cartItemId" (click)="changeQuantity(line, line.quantity + 1)" [attr.aria-label]="'Increase quantity of ' + line.productName">+</button>
                    </div>
                    <button class="text-button text-button--danger" type="button" [disabled]="busyId() === line.cartItemId" (click)="remove(line)">Remove</button>
                  </div>
                  @if (lineErrorId() === line.cartItemId) {
                    <span class="field-error">{{ lineError() }}</span>
                  }
                </div>
                <div class="cart-line__price">
                  <span>{{ line.unitPrice | currency:'PKR':'code':'1.0-2' }}</span>
                  <small>{{ line.lineTotal | currency:'PKR':'code':'1.0-2' }}</small>
                </div>
              </article>
            }
            <button class="text-button cart-clear" type="button" [disabled]="clearing()" (click)="clear()">
              {{ clearing() ? 'Clearing…' : 'Clear bag' }}
            </button>
          </section>

          <aside class="cart-summary">
            <p class="eyebrow">Order summary</p>
            <h2>Ready when you are.</h2>
            <div class="cart-summary__row"><span>Subtotal</span><strong>{{ cart()!.subtotal | currency:'PKR':'code':'1.0-2' }}</strong></div>
            <p class="cart-summary__note">Shipping and tax are confirmed by the server during checkout.</p>
            <button class="btn btn-accent cart-summary__checkout" type="button" [disabled]="hasUnavailable()" (click)="goToCheckout()">
              Continue to checkout <span aria-hidden="true">→</span>
            </button>
            @if (hasUnavailable()) {
              <p class="cart-summary__warning" role="status">Remove unavailable items before checkout.</p>
            }
            <a class="cart-summary__continue" routerLink="/">Continue shopping</a>
          </aside>
        </div>
      }
    </section>
  `,
  styleUrl: './cart-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPageComponent implements OnInit {
  readonly cart = signal<CartDto | null>(null);
  readonly loading = signal(true);
  readonly clearing = signal(false);
  readonly busyId = signal<number | null>(null);
  readonly lineErrorId = signal<number | null>(null);
  readonly lineError = signal('');
  readonly error = signal('');
  readonly message = signal('');

  constructor(
    private readonly carts: CartApiService,
    private readonly cartState: CartStateService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.carts.getCart().subscribe({
      next: (cart) => {
        this.cart.set(cart);
        this.cartState.setCount(cart.totalQuantity);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Your bag could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  changeQuantity(line: CartLineDto, quantity: number): void {
    this.busyId.set(line.cartItemId);
    this.lineErrorId.set(null);
    this.carts.updateItem(line.cartItemId, { quantity }).subscribe({
      next: (cart) => this.setCart(cart),
      error: (failure: unknown) => {
        this.lineErrorId.set(line.cartItemId);
        this.lineError.set(parseApiFailure(failure, 'The quantity could not be updated.').message);
        this.busyId.set(null);
      },
    });
  }

  remove(line: CartLineDto): void {
    this.busyId.set(line.cartItemId);
    this.lineErrorId.set(null);
    this.carts.removeItem(line.cartItemId).subscribe({
      next: () => this.load(),
      error: (failure: unknown) => {
        this.lineErrorId.set(line.cartItemId);
        this.lineError.set(parseApiFailure(failure, 'The item could not be removed.').message);
        this.busyId.set(null);
      },
    });
  }

  clear(): void {
    if (!this.cart()?.items.length || this.clearing()) {
      return;
    }
    if (!window.confirm('Remove every item from your bag?')) {
      return;
    }
    this.clearing.set(true);
    this.carts.clear().subscribe({
      next: () => {
        this.clearing.set(false);
        this.message.set('Your bag has been cleared.');
        this.load();
      },
      error: (failure: unknown) => {
        this.clearing.set(false);
        this.error.set(parseApiFailure(failure, 'Your bag could not be cleared.').message);
      },
    });
  }

  hasUnavailable(): boolean {
    return this.cart()?.items.some((line) => !line.isAvailable || line.quantity > line.quantityAvailable) ?? false;
  }

  goToCheckout(): void {
    if (!this.hasUnavailable()) {
      void this.router.navigate(['/checkout']);
    }
  }

  productMark(name: string): string {
    return name.trim().slice(0, 1).toUpperCase() || 'T';
  }

  optionText(line: CartLineDto): string {
    const options = [
      line.options.colorName,
      line.options.sizeName,
      line.options.volumeMl ? `${line.options.volumeMl} ml` : null,
    ].filter((value): value is string => Boolean(value));
    return options.join(' / ') || 'Standard option';
  }

  private setCart(cart: CartDto): void {
    this.cart.set(cart);
    this.cartState.setCount(cart.totalQuantity);
    this.busyId.set(null);
  }
}

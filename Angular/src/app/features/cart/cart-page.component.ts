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
  templateUrl: './cart-page.component.html',
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

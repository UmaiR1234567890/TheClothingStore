import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, catchError, map, of, tap } from 'rxjs';
import { CartDto, CartLineDto } from '../models/commerce.models';
import { parseApiFailure } from './api-error.service';
import { CartApiService } from './cart-api.service';

@Injectable({ providedIn: 'root' })
export class CartStateService {
  private readonly countSubject = new BehaviorSubject<number | null>(null);
  readonly count$ = this.countSubject.asObservable();
  readonly cart = signal<CartDto | null>(null);
  readonly drawerOpen = signal(false);
  readonly drawerLoading = signal(false);
  readonly busyId = signal<number | null>(null);
  readonly drawerError = signal('');

  constructor(private readonly carts: CartApiService) {}

  refresh(): void {
    this.carts.getCart().pipe(
      tap((cart) => this.cart.set(cart)),
      map((cart) => cart.totalQuantity),
      tap((count) => this.countSubject.next(count)),
      catchError(() => {
        this.countSubject.next(null);
        return of(null);
      }),
    ).subscribe();
  }

  setCount(count: number): void {
    this.countSubject.next(count);
  }

  applyCart(cart: CartDto): void {
    this.cart.set(cart);
    this.countSubject.next(cart.totalQuantity);
  }

  openDrawer(): void {
    this.drawerError.set('');
    this.drawerOpen.set(true);
    this.drawerLoading.set(this.cart() === null);
    this.carts.getCart().subscribe({
      next: (cart) => {
        this.applyCart(cart);
        this.drawerLoading.set(false);
      },
      error: (failure: unknown) => {
        this.drawerError.set(parseApiFailure(failure, 'Your bag could not be loaded.').message);
        this.drawerLoading.set(false);
      },
    });
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  toggleDrawer(): void {
    if (this.drawerOpen()) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }

  changeQuantity(line: CartLineDto, quantity: number): void {
    this.busyId.set(line.cartItemId);
    this.drawerError.set('');
    this.carts.updateItem(line.cartItemId, { quantity }).subscribe({
      next: (cart) => {
        this.applyCart(cart);
        this.busyId.set(null);
      },
      error: (failure: unknown) => {
        this.drawerError.set(parseApiFailure(failure, 'The quantity could not be updated.').message);
        this.busyId.set(null);
      },
    });
  }

  removeLine(line: CartLineDto): void {
    this.busyId.set(line.cartItemId);
    this.drawerError.set('');
    this.carts.removeItem(line.cartItemId).subscribe({
      next: () => {
        this.busyId.set(null);
        this.refresh();
      },
      error: (failure: unknown) => {
        this.drawerError.set(parseApiFailure(failure, 'The item could not be removed.').message);
        this.busyId.set(null);
      },
    });
  }
}

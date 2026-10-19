import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, of, tap } from 'rxjs';
import { CartApiService } from './cart-api.service';

@Injectable({ providedIn: 'root' })
export class CartStateService {
  private readonly countSubject = new BehaviorSubject<number | null>(null);
  readonly count$ = this.countSubject.asObservable();

  constructor(private readonly carts: CartApiService) {}

  refresh(): void {
    this.carts.getCart().pipe(
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
}

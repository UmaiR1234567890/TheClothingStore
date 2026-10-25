import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OrderDto } from '../../core/models/commerce.models';
import { OrderApiService } from '../../core/services/order-api.service';
import { CartApiService } from '../../core/services/cart-api.service';
import { CartStateService } from '../../core/services/cart-state.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-order-detail-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './order-detail-page.component.html',
  styleUrl: './orders-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailPageComponent implements OnInit {
  readonly order = signal<OrderDto | null>(null);
  readonly loading = signal(true);
  readonly reordering = signal(false);
  readonly error = signal('');
  readonly reorderError = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly orders: OrderApiService,
    private readonly cart: CartApiService,
    private readonly cartState: CartStateService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('Order was not found.');
      this.loading.set(false);
      return;
    }
    this.orders.getOrder(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'We could not load this order.').message);
        this.loading.set(false);
      },
    });
  }

  canReorder(order: OrderDto): boolean {
    return ['Cancelled', 'Returned', 'Refunded'].includes(order.status)
      && order.items.some((item) => item.productVariantId !== null);
  }

  reorder(): void {
    const order = this.order();
    if (!order || this.reordering()) {
      return;
    }
    this.reorderError.set('');
    this.reordering.set(true);
    const items = order.items.filter((item) => item.productVariantId !== null);
    const adds = items.map((item) =>
      this.cart.addItem({ productVariantId: item.productVariantId!, quantity: item.quantity })
        .pipe(catchError(() => of(null))));
    forkJoin(adds).subscribe((results) => {
      const last = [...results].reverse().find((cart) => cart !== null);
      const failed = results.length - results.filter((x) => x !== null).length;
      this.reordering.set(false);
      if (last) {
        this.cartState.setCount(last.totalQuantity);
      }
      if (failed > 0) {
        this.reorderError.set(failed === results.length
          ? 'These items could not be added back to your bag — they may be unavailable now.'
          : `${failed} item(s) could not be added back; the rest are in your bag.`);
        return;
      }
      void this.router.navigate(['/cart']);
    });
  }
}

import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrderDto } from '../../core/models/commerce.models';
import { OrderApiService } from '../../core/services/order-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';
import { PagedResult } from '../../core/models/api.models';

@Component({
  selector: 'tcs-order-history-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './order-history-page.component.html',
  styleUrl: './orders-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderHistoryPageComponent implements OnInit {
  readonly statuses = ['Pending', 'Paid', 'Processing', 'Shipped', 'Completed', 'Cancelled'];
  readonly result = signal<PagedResult<OrderDto> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly status = signal('');
  readonly pageNumber = signal(1);

  constructor(
    private readonly orders: OrderApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const page = Number(this.route.snapshot.queryParamMap.get('pageNumber') ?? '1');
    const status = this.route.snapshot.queryParamMap.get('status') ?? '';
    this.status.set(status);
    this.load(Number.isInteger(page) && page > 0 ? page : 1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set('');
    this.pageNumber.set(page);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { pageNumber: page, status: this.status() || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.orders.getOrders(page, 10, this.status() || undefined).subscribe({
      next: (result) => {
        this.result.set(result);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'We could not load your orders.').message);
        this.loading.set(false);
      },
    });
  }

  onStatusChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.status.set(target.value);
      this.load(1);
    }
  }

  paymentStatus(order: OrderDto): string {
    if (order.payments.length === 0) {
      return order.totalAmount === 0 ? 'Not required' : 'Pending';
    }
    return order.payments[0].status;
  }
}

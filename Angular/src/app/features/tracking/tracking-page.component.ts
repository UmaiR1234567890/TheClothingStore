import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderDto } from '../../core/models/commerce.models';
import { OrderApiService } from '../../core/services/order-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-tracking-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './tracking-page.component.html',
  styleUrl: '../orders/orders-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackingPageComponent implements OnInit {
  readonly order = signal<OrderDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly orders: OrderApiService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('Order was not found.');
      this.loading.set(false);
      return;
    }
    this.orders.getTracking(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'We could not load tracking information.').message);
        this.loading.set(false);
      },
    });
  }
}

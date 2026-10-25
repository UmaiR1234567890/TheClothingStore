import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderDto } from '../../core/models/commerce.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-order-detail-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './admin-order-detail-page.component.html',
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrderDetailPageComponent implements OnInit {
  readonly order = signal<OrderDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly admin: AdminApiService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('Order was not found.');
      this.loading.set(false);
      return;
    }
    this.load(id);
  }

  load(id: number): void {
    this.loading.set(true);
    this.admin.getOrder(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Order could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  nextStatuses(order: OrderDto): string[] {
    const captured = order.payments.some((payment) => payment.status === 'Captured');
    const refunded = order.payments.some((payment) => payment.status === 'Refunded');
    const shipped = order.shipments.some((shipment) => ['Shipped', 'InTransit', 'OutForDelivery', 'Delivered'].includes(shipment.status));
    const delivered = order.shipments.some((shipment) => shipment.status === 'Delivered');
    switch (order.status) {
      case 'Pending': return captured ? ['Paid'] : ['Processing', 'Cancelled'];
      case 'Processing': return [...(shipped ? ['Shipped'] : []), ...(captured ? ['Paid'] : []), ...(!captured ? ['Cancelled'] : [])];
      case 'Paid': return ['Processing'];
      case 'Shipped': return [...(delivered && captured ? ['Completed'] : []), 'Returned'];
      case 'Completed': return ['Returned'];
      case 'Returned': return [...(refunded ? ['Refunded'] : []), ...(!captured ? ['Cancelled'] : [])];
      default: return [];
    }
  }

  changeStatus(order: OrderDto, status: string): void {
    if (status === 'Cancelled' && !window.confirm(`Cancel order ${order.orderNumber}?`)) {
      return;
    }
    this.error.set('');
    this.admin.setOrderStatus(order.orderId, status).subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.message.set(`Order status changed to ${updated.status}.`);
      },
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'Order status could not be changed.').message),
    });
  }
}

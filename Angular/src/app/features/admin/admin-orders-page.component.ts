import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrderDto } from '../../core/models/commerce.models';
import { PagedResult } from '../../core/models/api.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-orders-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './admin-orders-page.component.html',
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrdersPageComponent implements OnInit {
  readonly statusOptions = ['Pending', 'Paid', 'Processing', 'Shipped', 'Completed', 'Cancelled'];
  readonly result = signal<PagedResult<OrderDto> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');
  readonly pageNumber = signal(1);
  readonly status = signal('');

  constructor(private readonly admin: AdminApiService) {}

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.pageNumber.set(page);
    this.loading.set(true);
    this.error.set('');
    this.admin.getOrders(page, 20, this.status() || undefined).subscribe({
      next: (result) => {
        this.result.set(result);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Orders could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  setStatusFilter(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.status.set(target.value);
      this.load(1);
    }
  }

  paymentStatus(order: OrderDto): string {
    return order.payments[0]?.status ?? (order.totalAmount === 0 ? 'Not required' : 'Pending');
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'Completed': return 'admin-badge--success';
      case 'Paid': case 'Shipped': return 'admin-badge--info';
      case 'Pending': case 'Processing': return 'admin-badge--warn';
      case 'Cancelled': return 'admin-badge--inactive';
      default: return 'admin-badge--neutral';
    }
  }

  nextStatuses(order: OrderDto): string[] {
    const captured = order.payments.some((payment) => payment.status === 'Captured');
    const shipped = order.shipments.some((shipment) => ['Shipped', 'Delivered'].includes(shipment.status));
    const delivered = order.shipments.some((shipment) => shipment.status === 'Delivered');
    switch (order.status) {
      case 'Pending': return captured ? ['Paid'] : ['Processing', 'Cancelled'];
      case 'Processing': return [...(shipped ? ['Shipped'] : []), ...(captured ? ['Paid'] : []), ...(!captured ? ['Cancelled'] : [])];
      case 'Paid': return ['Processing'];
      case 'Shipped': return delivered && captured ? ['Completed'] : [];
      default: return [];
    }
  }

  updateStatus(order: OrderDto, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !target.value) {
      return;
    }
    const status = target.value;
    if (status === 'Cancelled' && !window.confirm(`Cancel order ${order.orderNumber}? Stock will be restored only if the backend confirms cancellation.`)) {
      target.value = '';
      return;
    }
    this.error.set('');
    this.message.set('');
    this.admin.setOrderStatus(order.orderId, status).subscribe({
      next: () => {
        this.message.set(`Order ${order.orderNumber} status updated.`);
        this.load(this.pageNumber());
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'The order status could not be changed.').message);
        target.value = '';
      },
    });
  }
}

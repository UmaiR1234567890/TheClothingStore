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
  template: `
    <section class="admin-page">
      <div class="admin-page-heading">
        <div><p class="eyebrow">Operations / Orders</p><h1 class="page-title">Order desk.</h1></div>
        <span class="admin-page-heading__note">Status changes are checked by the API.</span>
      </div>
      <div class="admin-toolbar">
        <span class="muted-copy">{{ result()?.totalCount ?? 0 }} orders</span>
        <label class="orders-filter">
          <span>Status</span>
          <select class="admin-filter" [value]="status()" (change)="setStatusFilter($event)">
            <option value="">All statuses</option>
            @for (item of statusOptions; track item) { <option [value]="item">{{ item }}</option> }
          </select>
        </label>
      </div>
      @if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
      @if (message()) { <p class="notice notice-success" role="status">{{ message() }}</p> }
      @if (loading()) { <div class="state-panel"><span class="spinner" aria-label="Loading orders"></span></div> }
      @else if (result()?.items?.length) {
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Order</th><th>Placed</th><th>Customer</th><th>Payment</th><th>Total</th><th>Status</th><th>Change status</th></tr></thead>
            <tbody>
              @for (order of result()!.items; track order.orderId) {
                <tr>
                  <td><a [routerLink]="['/admin/orders', order.orderId]">{{ order.orderNumber }}</a><small>{{ order.items.length }} item lines</small></td>
                  <td>{{ order.placedAt | date:'short' }}</td>
                  <td>{{ order.guestEmail || order.shippingName || 'Registered customer' }}</td>
                  <td>{{ paymentStatus(order) }}</td>
                  <td>{{ order.totalAmount | currency:'PKR':'code':'1.0-2' }}</td>
                  <td><span class="admin-badge" [class.admin-badge--inactive]="order.status === 'Cancelled'">{{ order.status }}</span></td>
                  <td>
                    @if (nextStatuses(order).length > 0) {
                      <select class="admin-filter" [value]="''" (change)="updateStatus(order, $event)" aria-label="Change order status">
                        <option value="">Choose…</option>
                        @for (next of nextStatuses(order); track next) { <option [value]="next">{{ next }}</option> }
                      </select>
                    } @else { <span class="muted-copy">No transition</span> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (result()!.totalPages > 1) {
          <nav class="pagination" aria-label="Order pages">
            <button class="btn btn-outline btn-small" type="button" [disabled]="pageNumber() <= 1" (click)="load(pageNumber() - 1)">Previous</button>
            <span>Page {{ pageNumber() }} of {{ result()!.totalPages }}</span>
            <button class="btn btn-outline btn-small" type="button" [disabled]="pageNumber() >= result()!.totalPages" (click)="load(pageNumber() + 1)">Next</button>
          </nav>
        }
      } @else if (!error()) {
        <div class="state-panel"><h2>No orders found</h2></div>
      }
    </section>
  `,
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

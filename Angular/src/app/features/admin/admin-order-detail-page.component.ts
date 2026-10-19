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
  template: `
    <section class="admin-page">
      @if (loading()) { <div class="state-panel"><span class="spinner" aria-label="Loading order"></span></div> }
      @else if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
      @else {
        @if (order(); as current) {
        <div class="admin-page-heading">
          <div><p class="eyebrow">Order operations</p><h1 class="page-title">{{ current.orderNumber }}</h1></div>
          <a class="text-link" routerLink="/admin/orders">← All orders</a>
        </div>
        @if (message()) { <p class="notice notice-success" role="status">{{ message() }}</p> }
        <div class="admin-detail-grid">
          <section class="admin-form-card">
            <h2>Historical item snapshots</h2>
            @for (line of current.items; track $index) {
              <article class="snapshot-line">
                <div><strong>{{ line.productName }}</strong><p>{{ line.variantDetails || 'Standard option' }} · {{ line.sku }}</p><small>Quantity {{ line.quantity }}</small></div>
                <span>{{ line.lineTotal | currency:'PKR':'code':'1.0-2' }}</span>
              </article>
            }
            <div class="checkout-total-row"><span>Subtotal</span><span>{{ current.subtotalAmount | currency:'PKR':'code':'1.0-2' }}</span></div>
            <div class="checkout-total-row"><span>Discount</span><span>− {{ current.discountAmount | currency:'PKR':'code':'1.0-2' }}</span></div>
            <div class="checkout-total-row checkout-total-row--grand"><strong>Total</strong><strong>{{ current.totalAmount | currency:'PKR':'code':'1.0-2' }}</strong></div>
          </section>
          <aside class="admin-form-card">
            <h2>Order status</h2>
            <span class="admin-badge">{{ current.status }}</span>
            <p class="muted-copy">Placed {{ current.placedAt | date:'medium' }}</p>
            <p class="muted-copy">Guest/customer contact: {{ current.guestEmail || current.shippingName || 'Registered customer' }}</p>
            <div class="admin-form-actions">
              @for (status of nextStatuses(current); track status) {
                <button class="btn btn-outline btn-small" type="button" (click)="changeStatus(current, status)">{{ status }}</button>
              }
            </div>
            <h2>Payment and shipment</h2>
            @for (payment of current.payments; track payment.paymentId) {
              <p class="muted-copy">{{ payment.method }} · {{ payment.status }} · {{ payment.amount | currency:'PKR':'code':'1.0-2' }}</p>
            }
            @for (shipment of current.shipments; track shipment.shipmentId) {
              <p class="muted-copy">{{ shipment.status }} · {{ shipment.carrier || 'Carrier not set' }} · {{ shipment.trackingNumber || 'No tracking number' }}</p>
            }
            <a class="text-link" routerLink="/admin/shipments">Manage shipments →</a>
          </aside>
        </div>
        }
      }
    </section>
  `,
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

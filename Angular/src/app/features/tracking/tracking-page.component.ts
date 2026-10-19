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
  template: `
    <section class="account-page container">
      @if (loading()) {
        <div class="state-panel"><span class="spinner" aria-label="Loading shipment details"></span></div>
      } @else if (error()) {
        <div class="state-panel state-panel--error" role="alert"><h1 class="page-title">Tracking unavailable.</h1><p>{{ error() }}</p></div>
      } @else {
        @if (order(); as current) {
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <a routerLink="/account/orders">Order history</a><span>/</span>
          <a [routerLink]="['/account/orders', current.orderId]">{{ current.orderNumber }}</a><span>/</span>
          <span aria-current="page">Tracking</span>
        </nav>
        <p class="eyebrow">Delivery updates</p>
        <h1 class="page-title">Track your order.</h1>
        <p class="page-intro">Order {{ current.orderNumber }} · {{ current.status }}</p>
        @if (current.shipments.length > 0) {
          <div class="tracking-list">
            @for (shipment of current.shipments; track shipment.shipmentId) {
              <article class="tracking-card">
                <div class="tracking-card__icon" aria-hidden="true">↗</div>
                <div class="tracking-card__main">
                  <div class="tracking-card__top">
                    <div><span class="eyebrow">Shipment {{ shipment.shipmentId }}</span><h2>{{ shipment.status }}</h2></div>
                    <span class="status-pill" [attr.data-status]="shipment.status.toLowerCase()">{{ shipment.status }}</span>
                  </div>
                  <div class="tracking-card__details">
                    @if (shipment.carrier) { <div><span>Carrier</span><strong>{{ shipment.carrier }}</strong></div> }
                    @if (shipment.trackingNumber) { <div><span>Tracking number</span><strong>{{ shipment.trackingNumber }}</strong></div> }
                    @if (shipment.shippedAt) { <div><span>Shipped</span><strong>{{ shipment.shippedAt | date:'medium' }}</strong></div> }
                    @if (shipment.deliveredAt) { <div><span>Delivered</span><strong>{{ shipment.deliveredAt | date:'medium' }}</strong></div> }
                  </div>
                </div>
              </article>
            }
          </div>
        } @else {
          <div class="state-panel"><h2>Tracking is not available yet</h2><p>The store has not added a shipment for this order.</p></div>
        }
        }
      }
    </section>
  `,
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

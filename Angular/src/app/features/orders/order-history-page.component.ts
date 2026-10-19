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
  template: `
    <section class="account-page container">
      <div class="account-heading">
        <div><p class="eyebrow">Your account</p><h1 class="page-title">Order history.</h1></div>
        <nav class="account-nav" aria-label="Account navigation">
          <a routerLink="/account/profile">Profile</a>
          <a routerLink="/account/addresses">Addresses</a>
          <a class="is-active" routerLink="/account/orders">Orders</a>
        </nav>
      </div>

      <div class="orders-toolbar">
        <p class="page-intro">Your orders, with the original item and price details.</p>
        <label class="orders-filter">
          <span>Status</span>
          <select [value]="status()" (change)="onStatusChange($event)">
            <option value="">All orders</option>
            @for (value of statuses; track value) { <option [value]="value">{{ value }}</option> }
          </select>
        </label>
      </div>

      @if (loading()) {
        <div class="state-panel"><span class="spinner" aria-label="Loading orders"></span></div>
      } @else if (error()) {
        <div class="state-panel state-panel--error" role="alert">
          <h2>Orders unavailable</h2><p>{{ error() }}</p>
          <button class="btn btn-outline" type="button" (click)="load(pageNumber())">Try again</button>
        </div>
      } @else if ((result()?.items?.length ?? 0) === 0) {
        <div class="state-panel">
          <h2>No orders to show</h2>
          <p>When an order is placed, its saved details will appear here.</p>
          <a class="btn btn-primary" routerLink="/">Explore the collection</a>
        </div>
      } @else {
        <div class="orders-list">
          @for (order of result()!.items; track order.orderId) {
            <article class="order-card">
              <div class="order-card__top">
                <div>
                  <span class="order-card__label">Order</span>
                  <strong>{{ order.orderNumber }}</strong>
                </div>
                <span class="status-pill" [attr.data-status]="order.status.toLowerCase()">{{ order.status }}</span>
              </div>
              <div class="order-card__meta">
                <span>{{ order.placedAt | date:'mediumDate' }}</span>
                <span>{{ order.items.length }} {{ order.items.length === 1 ? 'line' : 'lines' }}</span>
                <span>Payment: {{ paymentStatus(order) }}</span>
              </div>
              <div class="order-card__items">
                @for (item of order.items.slice(0, 2); track $index) {
                  <div class="order-card__item">
                    <span>{{ item.productName }} <small>{{ item.variantDetails }}</small></span>
                    <span>× {{ item.quantity }}</span>
                  </div>
                }
                @if (order.items.length > 2) {
                  <span class="order-card__more">+ {{ order.items.length - 2 }} more item(s)</span>
                }
              </div>
              <div class="order-card__bottom">
                <span>Total <strong>{{ order.totalAmount | currency:'PKR':'code':'1.0-2' }}</strong></span>
                <a class="text-link" [routerLink]="['/account/orders', order.orderId]">View order <span aria-hidden="true">→</span></a>
              </div>
            </article>
          }
        </div>
        @if (result()!.totalPages > 1) {
          <nav class="pagination" aria-label="Order pages">
            <button class="btn btn-outline btn-small" type="button" [disabled]="pageNumber() <= 1" (click)="load(pageNumber() - 1)">Previous</button>
            <span>Page {{ pageNumber() }} of {{ result()!.totalPages }}</span>
            <button class="btn btn-outline btn-small" type="button" [disabled]="pageNumber() >= result()!.totalPages" (click)="load(pageNumber() + 1)">Next</button>
          </nav>
        }
      }
    </section>
  `,
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

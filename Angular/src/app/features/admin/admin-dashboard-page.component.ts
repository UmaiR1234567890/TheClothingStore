import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardSummaryDto } from '../../core/models/admin.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-dashboard-page',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  template: `
    <section class="admin-page">
      <div class="admin-page-heading">
        <div><p class="eyebrow">Overview</p><h1 class="page-title">Store dashboard.</h1></div>
        <span class="admin-page-heading__note">Live figures from the store database</span>
      </div>
      @if (error()) {
        <div class="notice notice-error" role="alert">{{ error() }} <button class="text-button" type="button" (click)="load()">Retry</button></div>
      } @else if (loading()) {
        <div class="dashboard-grid">
          @for (item of [1, 2, 3, 4]; track item) { <div class="dashboard-skeleton"></div> }
        </div>
      } @else {
        @if (summary(); as data) {
          <div class="dashboard-grid">
            <article class="metric-card"><span>Active products</span><strong>{{ data.productCount }}</strong><a routerLink="/admin/products">Manage products →</a></article>
            <article class="metric-card"><span>Customers</span><strong>{{ data.customerCount }}</strong><a routerLink="/admin/customers">View customers →</a></article>
            <article class="metric-card"><span>Pending orders</span><strong>{{ data.pendingOrderCount }}</strong><a routerLink="/admin/orders?status=Pending">Review orders →</a></article>
            <article class="metric-card metric-card--accent"><span>Captured revenue</span><strong>{{ data.capturedRevenue | currency:'PKR':'code':'1.0-2' }}</strong><small>From captured payments only</small></article>
          </div>
          <div class="admin-shortcuts">
            <div><p class="eyebrow">Quick access</p><h2>Keep the store in motion.</h2></div>
            <nav>
              <a routerLink="/admin/inventory">Inventory <span>→</span></a>
              <a routerLink="/admin/sales">Promotions <span>→</span></a>
              <a routerLink="/admin/shipments">Shipments <span>→</span></a>
            </nav>
          </div>
        }
      }
    </section>
  `,
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPageComponent implements OnInit {
  readonly summary = signal<DashboardSummaryDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor(private readonly admin: AdminApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin.getDashboardSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Dashboard data could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }
}

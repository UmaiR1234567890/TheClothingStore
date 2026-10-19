import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminCustomerDto } from '../../core/models/admin.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-customer-detail-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <section class="admin-page">
      <div class="admin-page-heading">
        <div><p class="eyebrow">Customers / Record</p><h1 class="page-title">Customer details.</h1></div>
        <a class="text-link" routerLink="/admin/customers">← Customers</a>
      </div>
      @if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
      @if (message()) { <p class="notice notice-success" role="status">{{ message() }}</p> }
      @if (loading()) { <div class="state-panel"><span class="spinner" aria-label="Loading customer"></span></div> }
      @else {
        @if (customer(); as item) {
        <div class="admin-detail-grid">
          <section class="admin-form-card">
            <span class="admin-badge" [class.admin-badge--inactive]="item.isDeleted">{{ item.isDeleted ? 'Inactive' : 'Active' }}</span>
            <h2>{{ item.firstName || 'Customer' }} {{ item.lastName || '' }}</h2>
            <p class="muted-copy">Customer #{{ item.customerId }}</p>
            <div class="customer-detail-row"><span>Email</span><strong>{{ item.email }}</strong></div>
            <div class="customer-detail-row"><span>Phone</span><strong>{{ item.phone || 'Not provided' }}</strong></div>
            <div class="customer-detail-row"><span>Created</span><strong>{{ item.createdAt | date:'medium' }}</strong></div>
            <p class="muted-copy">Authentication credentials and private Identity fields are not exposed here.</p>
            <button class="btn btn-outline" type="button" (click)="toggle()">{{ item.isDeleted ? 'Reactivate customer' : 'Deactivate customer' }}</button>
          </section>
        </div>
        }
      }
    </section>
  `,
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCustomerDetailPageComponent implements OnInit {
  readonly customer = signal<AdminCustomerDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');
  private customerId = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly admin: AdminApiService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('Customer was not found.');
      this.loading.set(false);
      return;
    }
    this.customerId = id;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.getCustomer(this.customerId).subscribe({
      next: (customer) => {
        this.customer.set(customer);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Customer details could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  toggle(): void {
    const customer = this.customer();
    if (!customer) {
      return;
    }
    const status = customer.isDeleted ? 'Active' : 'Inactive';
    if (!window.confirm(`${customer.isDeleted ? 'Reactivate' : 'Deactivate'} ${customer.email}?`)) {
      return;
    }
    this.admin.setCustomerStatus(customer.customerId, status).subscribe({
      next: () => {
        this.message.set(`Customer ${status.toLowerCase()}.`);
        this.load();
      },
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'Customer status could not be changed.').message),
    });
  }
}

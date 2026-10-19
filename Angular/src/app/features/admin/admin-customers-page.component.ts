import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminCustomerDto } from '../../core/models/admin.models';
import { PagedResult } from '../../core/models/api.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-customers-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <section class="admin-page">
      <div class="admin-page-heading"><div><p class="eyebrow">People</p><h1 class="page-title">Customers.</h1></div></div>
      @if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
      @if (message()) { <p class="notice notice-success" role="status">{{ message() }}</p> }
      @if (loading()) { <div class="state-panel"><span class="spinner" aria-label="Loading customers"></span></div> }
      @else if (customers()?.items?.length) {
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Customer</th><th>Contact</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              @for (customer of customers()!.items; track customer.customerId) {
                <tr>
                  <td><a [routerLink]="['/admin/customers', customer.customerId]">{{ customer.firstName || 'Customer' }} {{ customer.lastName || '' }}</a><small>#{{ customer.customerId }}</small></td>
                  <td>{{ customer.email }}<small>{{ customer.phone || 'No phone on file' }}</small></td>
                  <td>{{ customer.createdAt | date:'mediumDate' }}</td>
                  <td><span class="admin-badge" [class.admin-badge--inactive]="customer.isDeleted">{{ customer.isDeleted ? 'Inactive' : 'Active' }}</span></td>
                  <td><button class="text-button" type="button" (click)="toggle(customer)">{{ customer.isDeleted ? 'Reactivate' : 'Deactivate' }}</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (customers()!.totalPages > 1) {
          <nav class="pagination" aria-label="Customer pages">
            <button class="btn btn-outline btn-small" type="button" [disabled]="pageNumber() <= 1" (click)="load(pageNumber() - 1)">Previous</button>
            <span>Page {{ pageNumber() }} of {{ customers()!.totalPages }}</span>
            <button class="btn btn-outline btn-small" type="button" [disabled]="pageNumber() >= customers()!.totalPages" (click)="load(pageNumber() + 1)">Next</button>
          </nav>
        }
      } @else if (!error()) {
        <div class="state-panel"><h2>No customers found</h2></div>
      }
    </section>
  `,
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCustomersPageComponent implements OnInit {
  readonly customers = signal<PagedResult<AdminCustomerDto> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');
  readonly pageNumber = signal(1);

  constructor(private readonly admin: AdminApiService) {}

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.pageNumber.set(page);
    this.loading.set(true);
    this.error.set('');
    this.admin.getCustomers(page, 20).subscribe({
      next: (customers) => {
        this.customers.set(customers);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Customers could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  toggle(customer: AdminCustomerDto): void {
    const status = customer.isDeleted ? 'Active' : 'Inactive';
    const action = customer.isDeleted ? 'Reactivate' : 'Deactivate';
    if (!window.confirm(`${action} ${customer.email}?`)) {
      return;
    }
    this.admin.setCustomerStatus(customer.customerId, status).subscribe({
      next: () => {
        this.message.set(`Customer ${status.toLowerCase()}.`);
        this.load(this.pageNumber());
      },
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'Customer status could not be changed.').message),
    });
  }
}

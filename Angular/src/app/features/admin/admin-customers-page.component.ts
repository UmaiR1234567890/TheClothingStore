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
  templateUrl: './admin-customers-page.component.html',
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

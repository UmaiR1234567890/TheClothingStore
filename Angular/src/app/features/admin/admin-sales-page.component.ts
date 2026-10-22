import { DatePipe, PercentPipe, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SaleWriteRequest } from '../../core/models/admin.models';
import { SaleDto } from '../../core/models/catalog.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-sales-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './admin-sales-page.component.html',
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSalesPageComponent implements OnInit {
  readonly sales = signal<SaleDto[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    discountType: new FormControl<'Percentage' | 'FixedAmount'>('Percentage', { nonNullable: true }),
    discountValue: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    productIds: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    startsAt: new FormControl('', { nonNullable: true }),
    endsAt: new FormControl('', { nonNullable: true }),
  });

  constructor(private readonly admin: AdminApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin.getSales(1, 100).subscribe({
      next: (page) => {
        this.sales.set(page.items);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Promotions could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  discountLabel(sale: SaleDto): string {
    return sale.discountType === 'Percentage'
      ? `${sale.discountValue}%`
      : `${sale.discountValue.toLocaleString()} PKR`;
  }

  createMode(): void {
    this.form.reset({ name: '', discountType: 'Percentage', discountValue: null, productIds: '', startsAt: '', endsAt: '' });
    this.error.set('');
    this.editing.set(true);
  }

  create(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    if (this.form.invalid || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    const productIds = value.productIds.split(',')
      .map((part) => Number(part.trim()))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (productIds.length === 0) {
      this.error.set('Enter at least one valid product ID.');
      return;
    }
    const request: SaleWriteRequest = {
      name: value.name.trim(),
      discountType: value.discountType,
      discountValue: value.discountValue ?? 0,
      startsAt: value.startsAt ? new Date(value.startsAt).toISOString() : null,
      endsAt: value.endsAt ? new Date(value.endsAt).toISOString() : null,
      productIds,
    };
    this.saving.set(true);
    this.admin.createSale(request).subscribe({
      next: () => {
        this.message.set('Promotion created.');
        this.saving.set(false);
        this.editing.set(false);
        this.load();
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Promotion could not be created.').message);
        this.saving.set(false);
      },
    });
  }

  toggle(sale: SaleDto): void {
    this.admin.setSaleStatus(sale.saleId, sale.isActive ? 'Inactive' : 'Active').subscribe({
      next: () => this.load(),
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'Promotion status could not be changed.').message),
    });
  }

  remove(sale: SaleDto): void {
    if (!window.confirm(`Soft-delete “${sale.name}”?`)) {
      return;
    }
    this.admin.deleteSale(sale.saleId).subscribe({
      next: () => this.load(),
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'Promotion could not be deleted.').message),
    });
  }
}

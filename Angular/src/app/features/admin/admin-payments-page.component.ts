import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaymentDto } from '../../core/models/commerce.models';
import { PagedResult } from '../../core/models/api.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-payments-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './admin-payments-page.component.html',
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPaymentsPageComponent implements OnInit {
  readonly payments = signal<PagedResult<PaymentDto> | null>(null);
  readonly selectedPayment = signal<PaymentDto | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly reason = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.maxLength(400)] });

  constructor(private readonly admin: AdminApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin.getPayments(1, 100).subscribe({
      next: (payments) => {
        this.payments.set(payments);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Payments could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  selectPayment(payment: PaymentDto): void {
    this.selectedPayment.set(payment);
    this.reason.reset('');
    this.error.set('');
    this.message.set('');
  }

  confirmCollection(): void {
    this.reason.markAsTouched();
    const payment = this.selectedPayment();
    if (!payment || this.reason.invalid || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.admin.markCodCollected(payment.paymentId, {
      status: 'Captured',
      reason: this.reason.value.trim(),
    }).subscribe({
      next: () => {
        this.message.set(`COD collection for payment #${payment.paymentId} was recorded.`);
        this.selectedPayment.set(null);
        this.saving.set(false);
        this.load();
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Cash collection could not be recorded.').message);
        this.saving.set(false);
      },
    });
  }
}

import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaymentDto } from '../../core/models/commerce.models';
import { PagedResult } from '../../core/models/api.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

type PaymentAction = 'collect' | 'refund';

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
  readonly dialog = signal<{ action: PaymentAction; payment: PaymentDto } | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly search = new FormControl('', { nonNullable: true });
  readonly reason = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.maxLength(400)] });

  constructor(private readonly admin: AdminApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin.getPayments(1, 100, this.search.value.trim() || undefined).subscribe({
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

  runSearch(event: Event): void {
    event.preventDefault();
    this.load();
  }

  openDialog(action: PaymentAction, payment: PaymentDto): void {
    this.dialog.set({ action, payment });
    this.reason.reset('');
    this.error.set('');
    this.message.set('');
  }

  closeDialog(): void {
    if (!this.saving()) {
      this.dialog.set(null);
    }
  }

  confirmDialog(): void {
    this.reason.markAsTouched();
    const current = this.dialog();
    if (!current || this.reason.invalid || this.saving()) {
      return;
    }
    const request = { reason: this.reason.value.trim() };
    this.saving.set(true);
    const call = current.action === 'collect'
      ? this.admin.markCodCollected(current.payment.paymentId, { status: 'Captured', ...request })
      : this.admin.refundPayment(current.payment.paymentId, request);
    call.subscribe({
      next: () => {
        this.message.set(current.action === 'collect'
          ? `COD collection for ${current.payment.orderNumber ?? 'order #' + current.payment.orderId} was recorded.`
          : `Payment #${current.payment.paymentId} was refunded; stock was restored and the order marked refunded.`);
        this.dialog.set(null);
        this.saving.set(false);
        this.load();
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, current.action === 'collect'
          ? 'Cash collection could not be recorded.'
          : 'The refund could not be recorded.').message);
        this.saving.set(false);
      },
    });
  }
}

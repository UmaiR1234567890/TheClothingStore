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
  template: `
    <section class="admin-page">
      <div class="admin-page-heading">
        <div><p class="eyebrow">Operations / Payments</p><h1 class="page-title">Payment records.</h1></div>
      </div>
      <p class="notice">Only COD is enabled. Mark cash as collected only after the store has verified receipt.</p>
      @if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
      @if (message()) { <p class="notice notice-success" role="status">{{ message() }}</p> }
      @if (loading()) { <div class="state-panel"><span class="spinner" aria-label="Loading payments"></span></div> }
      @else {
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Payment</th><th>Order</th><th>Method/provider</th><th>Amount</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
            <tbody>
              @for (payment of payments()?.items ?? []; track payment.paymentId) {
                <tr>
                  <td>#{{ payment.paymentId }}</td>
                  <td>#{{ payment.orderId }}</td>
                  <td>{{ payment.method }}<small>{{ payment.provider || 'No provider configured' }}</small></td>
                  <td>{{ payment.amount | currency:'PKR':'code':'1.0-2' }}</td>
                  <td><span class="admin-badge" [class.admin-badge--inactive]="payment.status !== 'Captured'">{{ payment.status }}</span></td>
                  <td>{{ payment.createdAt | date:'short' }}</td>
                  <td>
                    @if (payment.method === 'COD' && payment.status === 'Pending') {
                      <button class="text-button" type="button" (click)="selectPayment(payment)">Record collection</button>
                    } @else { <span class="muted-copy">—</span> }
                  </td>
                </tr>
              } @empty { <tr><td colspan="7">No payment records found.</td></tr> }
            </tbody>
          </table>
        </div>
      }

      @if (selectedPayment(); as payment) {
        <section class="admin-form-card">
          <p class="eyebrow">Cash on delivery · Order #{{ payment.orderId }}</p>
          <h2>Record cash collection.</h2>
          <p class="muted-copy">{{ payment.amount | currency:'PKR':'code':'1.0-2' }} stays pending until the administrator confirms collection.</p>
          <div class="field">
            <label for="cash-reason">Collection reason / reference</label>
            <textarea id="cash-reason" class="control" rows="3" [formControl]="reason" placeholder="Describe how collection was verified"></textarea>
          </div>
          @if (reason.touched && reason.invalid) { <span class="field-error">Enter a reason of at least 3 characters.</span> }
          <div class="admin-form-actions">
            <button class="btn btn-primary" type="button" [disabled]="saving()" (click)="confirmCollection()">{{ saving() ? 'Saving…' : 'Confirm COD collected' }}</button>
            <button class="btn btn-outline" type="button" (click)="selectedPayment.set(null)">Cancel</button>
          </div>
        </section>
      }
    </section>
  `,
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

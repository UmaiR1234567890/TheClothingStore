import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryAdjustmentRequest, InventoryDto, InventoryTransactionDto } from '../../core/models/admin.models';
import { PagedResult } from '../../core/models/api.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-inventory-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './admin-inventory-page.component.html',
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminInventoryPageComponent implements OnInit {
  readonly inventory = signal<PagedResult<InventoryDto> | null>(null);
  readonly transactions = signal<InventoryTransactionDto[]>([]);
  readonly loading = signal(true);
  readonly transactionsLoading = signal(false);
  readonly adjusting = signal(false);
  readonly error = signal('');
  readonly transactionError = signal('');
  readonly message = signal('');
  readonly pageNumber = signal(1);
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly adjustTarget = signal<InventoryDto | null>(null);
  readonly historyTarget = signal<InventoryDto | null>(null);
  readonly adjustmentForm = new FormGroup({
    productVariantId: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    quantityChange: new FormControl<number | null>(null, Validators.required),
    reason: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.maxLength(400)] }),
  });
  private selectedVariantId: number | null = null;

  constructor(private readonly admin: AdminApiService) {}

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.pageNumber.set(page);
    this.loading.set(true);
    this.error.set('');
    this.admin.getInventory(page, 20, this.searchControl.value.trim() || undefined).subscribe({
      next: (result) => {
        this.inventory.set(result);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Inventory could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  search(): void {
    this.load(1);
  }

  openAdjust(item: InventoryDto): void {
    this.adjustTarget.set(item);
    this.adjustmentForm.reset({ productVariantId: item.productVariantId, quantityChange: null, reason: '' });
  }

  closeAdjust(): void {
    if (!this.adjusting()) {
      this.adjustTarget.set(null);
    }
  }

  openHistory(item: InventoryDto): void {
    this.historyTarget.set(item);
    this.showTransactions(item);
  }

  closeHistory(): void {
    this.historyTarget.set(null);
  }

  showTransactions(item: InventoryDto): void {
    this.selectedVariantId = item.productVariantId;
    this.transactionError.set('');
    this.transactionsLoading.set(true);
    this.admin.getInventoryTransactions(1, 20, item.productVariantId).subscribe({
      next: (result) => {
        this.transactions.set(result.items);
        this.transactionsLoading.set(false);
      },
      error: (failure: unknown) => {
        this.transactionError.set(parseApiFailure(failure, 'Inventory history could not be loaded.').message);
        this.transactionsLoading.set(false);
      },
    });
  }

  adjust(): void {
    this.adjustmentForm.markAllAsTouched();
    this.error.set('');
    this.message.set('');
    if (this.adjustmentForm.invalid || this.adjusting()) {
      return;
    }
    const value = this.adjustmentForm.getRawValue();
    const request: InventoryAdjustmentRequest = {
      productVariantId: value.productVariantId!,
      quantityChange: value.quantityChange!,
      reason: value.reason.trim(),
    };
    this.adjusting.set(true);
    this.admin.adjustInventory(request).subscribe({
      next: (item) => {
        this.message.set(`Stock updated for ${item.sku}. Available quantity: ${item.quantityAvailable}.`);
        this.adjusting.set(false);
        this.adjustTarget.set(null);
        this.load(this.pageNumber());
        if (this.selectedVariantId === item.productVariantId) {
          this.showTransactions(item);
        }
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Inventory adjustment was rejected.').message);
        this.adjusting.set(false);
      },
    });
  }
}

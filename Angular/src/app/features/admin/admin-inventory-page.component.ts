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
  template: `
    <section class="admin-page">
      <div class="admin-page-heading">
        <div><p class="eyebrow">Operations / Stock</p><h1 class="page-title">Inventory.</h1></div>
      </div>
      @if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
      @if (message()) { <p class="notice notice-success" role="status">{{ message() }}</p> }

      <div class="admin-toolbar">
        <form class="admin-toolbar__search" (ngSubmit)="search()">
          <input class="control" type="search" [formControl]="searchControl" placeholder="Find by SKU or product" aria-label="Search inventory">
          <button class="btn btn-outline btn-small" type="submit">Search</button>
        </form>
        <span class="muted-copy">{{ inventory()?.totalCount ?? 0 }} variants</span>
      </div>
      @if (loading()) { <div class="state-panel"><span class="spinner" aria-label="Loading inventory"></span></div> }
      @else if (inventory()?.items?.length) {
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>SKU</th><th>On hand</th><th>Reserved</th><th>Available</th><th>Updated</th><th>Ledger</th></tr></thead>
            <tbody>
              @for (item of inventory()!.items; track item.productVariantId) {
                <tr>
                  <td><strong>{{ item.sku }}</strong><small>Variant #{{ item.productVariantId }}</small></td>
                  <td>{{ item.quantityOnHand }}</td><td>{{ item.quantityReserved }}</td>
                  <td><span class="inventory-available" [class.inventory-available--low]="item.quantityAvailable <= 5">{{ item.quantityAvailable }}</span></td>
                  <td>{{ item.updatedAt | date:'short' }}</td>
                  <td><button class="text-button" type="button" (click)="showTransactions(item)">View history</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (inventory()!.totalPages > 1) {
          <nav class="pagination" aria-label="Inventory pages">
            <button class="btn btn-outline btn-small" type="button" [disabled]="pageNumber() <= 1" (click)="load(pageNumber() - 1)">Previous</button>
            <span>Page {{ pageNumber() }} of {{ inventory()!.totalPages }}</span>
            <button class="btn btn-outline btn-small" type="button" [disabled]="pageNumber() >= inventory()!.totalPages" (click)="load(pageNumber() + 1)">Next</button>
          </nav>
        }
      } @else if (!error()) {
        <div class="state-panel"><h2>No inventory rows found</h2><p>Variants receive an inventory row when created by the admin API.</p></div>
      }

      <div class="admin-operations-grid">
        <form class="admin-form-card" [formGroup]="adjustmentForm" (ngSubmit)="adjust()">
          <p class="eyebrow">Manual stock control</p><h2>Adjust inventory.</h2>
          <p class="muted-copy">A signed adjustment changes on-hand stock. Reserved stock cannot be reduced below its reserved quantity.</p>
          <div class="field"><label for="adjust-variant">Variant ID</label><input id="adjust-variant" class="control" type="number" min="1" formControlName="productVariantId"></div>
          <div class="field"><label for="adjust-quantity">Quantity change</label><input id="adjust-quantity" class="control" type="number" formControlName="quantityChange"><small>Use a positive number for incoming stock or a negative number for a reduction.</small></div>
          <div class="field"><label for="adjust-reason">Reason</label><textarea id="adjust-reason" class="control" rows="3" formControlName="reason"></textarea></div>
          <button class="btn btn-primary" type="submit" [disabled]="adjusting()">{{ adjusting() ? 'Saving…' : 'Record adjustment' }}</button>
        </form>
        <section class="admin-form-card">
          <p class="eyebrow">Inventory ledger</p><h2>Recent transactions.</h2>
          @if (transactionError()) { <p class="notice notice-error" role="alert">{{ transactionError() }}</p> }
          @if (transactionsLoading()) {
            <div class="state-panel"><span class="spinner" aria-label="Loading transactions"></span></div>
          } @else if (transactions().length > 0) {
            <div class="transaction-list">
              @for (item of transactions(); track item.inventoryTransactionId) {
                <article class="transaction-row">
                  <div><strong>{{ item.sku }}</strong><small>{{ item.transactionType }} · {{ item.createdAt | date:'short' }}</small></div>
                  <span [class.transaction-row__negative]="item.quantityChange < 0">{{ item.quantityChange > 0 ? '+' : '' }}{{ item.quantityChange }}</span>
                </article>
              }
            </div>
          } @else {
            <p class="muted-copy">Select a variant from the inventory table to review its ledger.</p>
          }
        </section>
      </div>
    </section>
  `,
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

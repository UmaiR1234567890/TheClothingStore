import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductVariantDto } from '../../core/models/catalog.models';
import { VariantWriteRequest } from '../../core/models/admin.models';
import { ProductDetailDto } from '../../core/models/catalog.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-variants-page',
  standalone: true,
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  template: `
    <section class="admin-page">
      <div class="admin-page-heading">
        <div><p class="eyebrow">Products / Variants</p><h1 class="page-title">Variant options.</h1></div>
        <a class="text-link" [routerLink]="['/admin/products', productId(), 'edit']">← Edit product</a>
      </div>
      @if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
      @if (message()) { <p class="notice notice-success" role="status">{{ message() }}</p> }
      @if (loading()) { <div class="state-panel"><span class="spinner" aria-label="Loading variants"></span></div> }
      @else {
        @if (product(); as item) {
        <div class="admin-context-card">
          <span class="admin-badge">{{ item.status }}</span>
          <strong>{{ item.name }}</strong><small>{{ item.slug }}</small>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>SKU</th><th>Options</th><th>Price</th><th>Available</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              @for (variant of item.variants; track variant.productVariantId) {
                <tr>
                  <td><strong>{{ variant.sku }}</strong></td>
                  <td>{{ optionText(variant) }}</td>
                  <td>{{ variant.regularPrice | currency:'PKR':'code':'1.0-2' }}</td>
                  <td>{{ variant.quantityAvailable }}</td>
                  <td><span class="admin-badge" [class.admin-badge--inactive]="!variant.isActive || variant.isDeleted">{{ variant.isDeleted ? 'Deleted' : variant.isActive ? 'Active' : 'Inactive' }}</span></td>
                  <td><div class="admin-inline-actions">
                    <button type="button" (click)="edit(variant)">Edit</button>
                    @if (!variant.isDeleted) { <button type="button" (click)="setStatus(variant, variant.isActive ? 'Inactive' : 'Active')">{{ variant.isActive ? 'Deactivate' : 'Activate' }}</button> }
                  </div></td>
                </tr>
              } @empty {
                <tr><td colspan="6">No variants have been added.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <form class="admin-form-card" [formGroup]="form" (ngSubmit)="save()">
          <h2>{{ editingId() ? 'Edit variant' : 'Add variant' }}</h2>
          <p class="muted-copy">The API has no color/size reference-list endpoint; enter IDs from the approved reference data. Perfume variants use volume instead.</p>
          <div class="admin-form-grid">
            <div class="field"><label for="variant-sku">SKU</label><input id="variant-sku" class="control" formControlName="sku" maxlength="64"></div>
            <div class="field"><label for="variant-price">Regular price (PKR)</label><input id="variant-price" class="control" type="number" min="0" step="0.01" formControlName="regularPrice"></div>
          </div>
          <div class="admin-form-grid">
            <div class="field"><label for="variant-color">Color ID <span class="field-optional">Optional</span></label><input id="variant-color" class="control" type="number" min="1" formControlName="colorId"></div>
            <div class="field"><label for="variant-size">Size ID <span class="field-optional">Optional</span></label><input id="variant-size" class="control" type="number" min="1" formControlName="sizeId"></div>
          </div>
          <div class="admin-form-grid">
            <div class="field"><label for="variant-volume">Volume (ml) <span class="field-optional">Perfume only</span></label><input id="variant-volume" class="control" type="number" min="1" formControlName="volumeMl"></div>
            @if (editingId()) {
              <label class="admin-check-row"><input type="checkbox" formControlName="isActive"> Active for sale</label>
            }
          </div>
          @if (form.controls.sku.touched && form.controls.sku.invalid) { <span class="field-error">SKU is required and must be 64 characters or fewer.</span> }
          <div class="admin-form-actions">
            <button class="btn btn-primary" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : editingId() ? 'Save variant' : 'Add variant' }}</button>
            @if (editingId()) { <button class="btn btn-outline" type="button" (click)="resetForm()">Cancel edit</button> }
          </div>
        </form>
        }
      }
    </section>
  `,
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminVariantsPageComponent implements OnInit {
  readonly productId = signal<number>(0);
  readonly product = signal<ProductDetailDto | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly form = new FormGroup({
    sku: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(64)] }),
    regularPrice: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    colorId: new FormControl<number | null>(null, [Validators.min(1)]),
    sizeId: new FormControl<number | null>(null, [Validators.min(1)]),
    volumeMl: new FormControl<number | null>(null, [Validators.min(1)]),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly admin: AdminApiService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('Product was not found.');
      this.loading.set(false);
      return;
    }
    this.productId.set(id);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin.getProduct(this.productId()).subscribe({
      next: (product) => {
        this.product.set(product);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Variants could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  edit(variant: ProductVariantDto): void {
    this.editingId.set(variant.productVariantId);
    this.form.patchValue({
      sku: variant.sku,
      regularPrice: variant.regularPrice,
      colorId: variant.options.colorId,
      sizeId: variant.options.sizeId,
      volumeMl: variant.options.volumeMl,
      isActive: variant.isActive,
    });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form.reset({ sku: '', regularPrice: 0, colorId: null, sizeId: null, volumeMl: null, isActive: true });
  }

  save(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    this.message.set('');
    if (this.form.invalid || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    const request: VariantWriteRequest = {
      sku: value.sku.trim(),
      regularPrice: value.regularPrice,
      colorId: value.colorId,
      sizeId: value.sizeId,
      volumeMl: value.volumeMl,
      isActive: value.isActive,
    };
    this.saving.set(true);
    const id = this.editingId();
    const operation = id === null
      ? this.admin.createVariant(this.productId(), request)
      : this.admin.updateVariant(id, request);
    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set('Variant saved.');
        this.resetForm();
        this.load();
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Variant could not be saved.').message);
        this.saving.set(false);
      },
    });
  }

  setStatus(variant: ProductVariantDto, status: string): void {
    this.error.set('');
    this.admin.setVariantStatus(variant.productVariantId, status).subscribe({
      next: () => this.load(),
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'Variant status could not be updated.').message),
    });
  }

  optionText(variant: ProductVariantDto): string {
    return [variant.options.colorName, variant.options.sizeName, variant.options.volumeMl ? `${variant.options.volumeMl} ml` : null]
      .filter((item): item is string => Boolean(item))
      .join(' / ') || 'Standard option';
  }
}

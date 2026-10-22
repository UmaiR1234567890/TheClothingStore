import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ColorOptionDto, ProductDetailDto, ProductVariantDto, SizeOptionDto } from '../../core/models/catalog.models';
import { VariantWriteRequest } from '../../core/models/admin.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-variants-page',
  standalone: true,
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-variants-page.component.html',
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminVariantsPageComponent implements OnInit {
  readonly productId = signal<number>(0);
  readonly product = signal<ProductDetailDto | null>(null);
  readonly colors = signal<ColorOptionDto[]>([]);
  readonly sizes = signal<SizeOptionDto[]>([]);
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
    forkJoin({
      product: this.admin.getProduct(this.productId()),
      colors: this.admin.getColors(),
      sizes: this.admin.getSizes(),
    }).subscribe({
      next: ({ product, colors, sizes }) => {
        this.product.set(product);
        this.colors.set(colors.filter((color) => color.isActive));
        this.sizes.set(sizes.filter((size) => size.isActive));
        if (this.isPerfume()) {
          this.form.controls.volumeMl.addValidators(Validators.required);
        } else {
          this.form.controls.volumeMl.removeValidators(Validators.required);
        }
        this.form.controls.volumeMl.updateValueAndValidity({ emitEvent: false });
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Variants could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  isPerfume(): boolean {
    return this.product()?.categories.some((category) => category.slug.toLowerCase() === 'perfumes') ?? false;
  }

  availableSizes(): SizeOptionDto[] {
    if (this.isPerfume()) {
      return [];
    }
    const categories = this.product()?.categories.map((category) => category.slug.toLowerCase()) ?? [];
    const requiredType = categories.some((slug) => slug === 'footwear' || slug === 'shoes')
      ? 'Footwear'
      : 'Clothing';
    return this.sizes().filter((size) => size.sizeType === requiredType);
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

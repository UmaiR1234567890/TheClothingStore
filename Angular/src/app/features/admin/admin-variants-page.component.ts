import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ColorOptionDto, ProductDetailDto, ProductVariantDto, SizeOptionDto } from '../../core/models/catalog.models';
import { VariantWriteRequest } from '../../core/models/admin.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

interface VariantCombination {
  key: string;
  colorId: number | null;
  sizeId: number | null;
  colorName: string | null;
  sizeName: string | null;
  sku: string;
}

const NO_COLOR_KEY = 'none';

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

  readonly selectedColorKeys = signal<string[]>([]);
  readonly sizeSelections = signal<Record<string, number[]>>({});
  readonly stockDrafts = signal<Record<number, number>>({});
  readonly stockSavingId = signal<number | null>(null);

  readonly form = new FormGroup({
    sku: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(64)] }),
    regularPrice: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    colorId: new FormControl<number | null>(null, [Validators.min(1)]),
    sizeId: new FormControl<number | null>(null, [Validators.min(1)]),
    volumeMl: new FormControl<number | null>(null, [Validators.min(1)]),
    isActive: new FormControl(true, { nonNullable: true }),
    stockTarget: new FormControl<number | null>(null, [Validators.min(0)]),
  });

  readonly bulkForm = new FormGroup({
    skuBase: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(40)] }),
    regularPrice: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    initialStock: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
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
        this.stockDrafts.set({});
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

  colorByKey(key: string): ColorOptionDto | null {
    if (key === NO_COLOR_KEY) {
      return null;
    }
    const id = Number(key);
    return this.colors().find((color) => color.colorId === id) ?? null;
  }

  colorKey(colorId: number | null): string {
    return colorId === null ? NO_COLOR_KEY : String(colorId);
  }

  isColorKeySelected(key: string): boolean {
    return this.selectedColorKeys().includes(key);
  }

  toggleColorKey(key: string): void {
    const next = new Set(this.selectedColorKeys());
    if (next.has(key)) {
      next.delete(key);
      const sizes = { ...this.sizeSelections() };
      delete sizes[key];
      this.sizeSelections.set(sizes);
    } else {
      next.add(key);
      if (!(key in this.sizeSelections())) {
        this.sizeSelections.update((map) => ({ ...map, [key]: [] }));
      }
    }
    this.selectedColorKeys.set([...next]);
  }

  selectedSizesFor(key: string): number[] {
    return this.sizeSelections()[key] ?? [];
  }

  isSizeSelected(key: string, sizeId: number): boolean {
    return this.selectedSizesFor(key).includes(sizeId);
  }

  toggleSize(key: string, sizeId: number): void {
    const current = new Set(this.selectedSizesFor(key));
    current.has(sizeId) ? current.delete(sizeId) : current.add(sizeId);
    this.sizeSelections.update((map) => ({ ...map, [key]: [...current] }));
  }

  selectAllSizes(key: string): void {
    this.sizeSelections.update((map) => ({ ...map, [key]: this.availableSizes().map((size) => size.sizeId) }));
  }

  clearSizes(key: string): void {
    this.sizeSelections.update((map) => ({ ...map, [key]: [] }));
  }

  selectAllColors(): void {
    const allKeys = ['none', ...this.colors().map((color) => String(color.colorId))];
    this.selectedColorKeys.set(allKeys);
    const allSizeIds = this.availableSizes().map((size) => size.sizeId);
    const selections: Record<string, number[]> = {};
    for (const key of allKeys) {
      selections[key] = this.sizeSelections()[key] ?? allSizeIds;
    }
    this.sizeSelections.set(selections);
  }

  selectEverySizeEverywhere(): void {
    const allSizeIds = this.availableSizes().map((size) => size.sizeId);
    const selections: Record<string, number[]> = {};
    for (const key of this.selectedColorKeys()) {
      selections[key] = [...allSizeIds];
    }
    this.sizeSelections.set(selections);
  }

  clearColors(): void {
    this.selectedColorKeys.set([]);
    this.sizeSelections.set({});
  }

  sizeName(sizeId: number): string {
    return this.sizes().find((size) => size.sizeId === sizeId)?.name ?? '';
  }

  combinations(): VariantCombination[] {
    const base = this.bulkForm.controls.skuBase.value.trim();
    const combos: VariantCombination[] = [];
    for (const key of this.selectedColorKeys()) {
      const color = this.colorByKey(key);
      const sizeIds = this.selectedSizesFor(key);
      if (sizeIds.length === 0) {
        combos.push({
          key: `${key}:`,
          colorId: color?.colorId ?? null,
          sizeId: null,
          colorName: color?.name ?? null,
          sizeName: null,
          sku: buildSku(base, color?.name ?? null, null),
        });
        continue;
      }
      for (const sizeId of sizeIds) {
        const sizeName = this.sizeName(sizeId);
        combos.push({
          key: `${key}:${sizeId}`,
          colorId: color?.colorId ?? null,
          sizeId,
          colorName: color?.name ?? null,
          sizeName,
          sku: buildSku(base, color?.name ?? null, sizeName),
        });
      }
    }
    return combos;
  }

  existingSkus(): Set<string> {
    return new Set((this.product()?.variants ?? []).map((variant) => variant.sku.trim().toUpperCase()));
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
      stockTarget: variant.quantityAvailable,
    });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form.reset({ sku: '', regularPrice: 0, colorId: null, sizeId: null, volumeMl: null, isActive: true, stockTarget: null });
  }

  resetBulk(): void {
    this.bulkForm.reset({ skuBase: '', regularPrice: 0, initialStock: 0, isActive: true });
    this.selectedColorKeys.set([]);
    this.sizeSelections.set({});
  }

  stockDraft(variant: ProductVariantDto): number {
    return this.stockDrafts()[variant.productVariantId] ?? variant.quantityAvailable;
  }

  updateStockDraft(variant: ProductVariantDto, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    const value = Number(target.value);
    this.stockDrafts.update((map) => ({ ...map, [variant.productVariantId]: Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0 }));
  }

  saveStock(variant: ProductVariantDto): void {
    const target = this.stockDraft(variant);
    const delta = target - variant.quantityAvailable;
    if (delta === 0 || this.stockSavingId() !== null) {
      return;
    }
    this.error.set('');
    this.message.set('');
    this.stockSavingId.set(variant.productVariantId);
    this.admin.adjustInventory({
      productVariantId: variant.productVariantId,
      quantityChange: delta,
      reason: `Stock set to ${target} from the variants page.`,
    }).subscribe({
      next: () => {
        this.stockSavingId.set(null);
        this.message.set(`Stock for ${variant.sku} set to ${target}.`);
        this.load();
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Stock could not be updated.').message);
        this.stockSavingId.set(null);
      },
    });
  }

  save(): void {
    this.error.set('');
    this.message.set('');
    if (this.editingId() !== null || this.isPerfume()) {
      this.saveSingle();
    } else {
      this.saveBulk();
    }
  }

  private saveSingle(): void {
    this.form.markAllAsTouched();
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
    const variantId = this.editingId();
    const stockTarget = value.stockTarget;
    this.saving.set(true);
    if (variantId === null) {
      this.admin.createVariants(this.productId(), {
        variants: [request],
        initialStock: Math.max(0, Math.floor(stockTarget ?? 0)),
      }).subscribe({
        next: () => this.finishSave('Variant saved.'),
        error: (failure: unknown) => {
          this.error.set(parseApiFailure(failure, 'Variant could not be saved.').message);
          this.saving.set(false);
        },
      });
      return;
    }
    this.admin.updateVariant(variantId, request).subscribe({
      next: (variant) => {
        const delta = stockTarget !== null && stockTarget !== variant.quantityAvailable
          ? stockTarget - variant.quantityAvailable
          : 0;
        if (delta === 0) {
          this.finishSave('Variant saved.');
          return;
        }
        this.admin.adjustInventory({
          productVariantId: variantId,
          quantityChange: delta,
          reason: `Stock set to ${stockTarget} while editing variant.`,
        }).subscribe({
          next: () => this.finishSave('Variant and stock saved.'),
          error: (failure: unknown) => {
            this.error.set(parseApiFailure(failure, 'Variant saved, but the stock update was rejected.').message);
            this.saving.set(false);
            this.load();
          },
        });
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Variant could not be saved.').message);
        this.saving.set(false);
      },
    });
  }

  private saveBulk(): void {
    this.bulkForm.markAllAsTouched();
    const combos = this.combinations();
    if (this.bulkForm.invalid || this.saving()) {
      return;
    }
    if (combos.length === 0) {
      this.error.set('Select at least one color (or "No color") to build variants.');
      return;
    }
    const value = this.bulkForm.getRawValue();
    const known = this.existingSkus();
    const seen = new Set<string>();
    const variants: VariantWriteRequest[] = [];
    for (const combo of combos) {
      let sku = combo.sku;
      let index = 2;
      while (seen.has(sku.toUpperCase()) || known.has(sku.toUpperCase())) {
        sku = `${combo.sku}-${index++}`.slice(0, 64);
      }
      seen.add(sku.toUpperCase());
      variants.push({
        sku,
        colorId: combo.colorId,
        sizeId: combo.sizeId,
        volumeMl: null,
        regularPrice: value.regularPrice,
        isActive: value.isActive,
      });
    }
    this.saving.set(true);
    this.admin.createVariants(this.productId(), { variants, initialStock: value.initialStock }).subscribe({
      next: (created) => {
        this.finishSave(`${created.length} variant${created.length === 1 ? '' : 's'} created.`);
        this.resetBulk();
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Variants could not be created.').message);
        this.saving.set(false);
      },
    });
  }

  private finishSave(text: string): void {
    this.saving.set(false);
    this.message.set(text);
    this.resetForm();
    this.load();
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

function buildSku(base: string, colorName: string | null, sizeName: string | null): string {
  const token = (value: string): string =>
    value.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const parts = [token(base), colorName ? token(colorName) : '', sizeName ? token(sizeName) : '']
    .filter((part) => part.length > 0);
  return parts.join('-').slice(0, 64);
}

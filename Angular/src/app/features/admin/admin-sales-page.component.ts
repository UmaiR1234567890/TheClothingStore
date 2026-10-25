import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SaleWriteRequest } from '../../core/models/admin.models';
import { CategoryDto, DepartmentDto, ProductCardDto, SaleDto } from '../../core/models/catalog.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { CatalogApiService } from '../../core/services/catalog-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

type ApplyMode = 'all' | 'specific';

@Component({
  selector: 'tcs-admin-sales-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './admin-sales-page.component.html',
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSalesPageComponent implements OnInit {
  readonly sales = signal<SaleDto[]>([]);
  readonly departments = signal<DepartmentDto[]>([]);
  readonly categories = signal<CategoryDto[]>([]);
  readonly pickerProducts = signal<ProductCardDto[]>([]);
  readonly pickerLoading = signal(false);
  readonly selectedProducts = signal(new Map<number, string>());
  readonly scopeDepartmentId = signal<number | null>(null);
  readonly scopeCategoryId = signal<number | null>(null);
  readonly applyMode = signal<ApplyMode>('all');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly editingSaleId = signal<number | null>(null);
  readonly error = signal('');
  readonly message = signal('');
  readonly productSearch = new FormControl('', { nonNullable: true });
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    discountType: new FormControl<'Percentage' | 'FixedAmount'>('Percentage', { nonNullable: true }),
    discountValue: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    startsAt: new FormControl('', { nonNullable: true }),
    endsAt: new FormControl('', { nonNullable: true }),
  });

  constructor(
    private readonly admin: AdminApiService,
    private readonly catalog: CatalogApiService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.load();
    this.admin.getDepartments().subscribe({
      next: (departments) => this.departments.set(departments.filter((d) => d.isActive)),
    });
    this.loadCategories();
    const promote = Number(this.route.snapshot.queryParamMap.get('promote'));
    if (Number.isInteger(promote) && promote > 0) {
      this.openCreateForProduct(promote);
    }
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

  scopeLabel(sale: SaleDto): string {
    if (sale.applyToAll) {
      return 'Entire store';
    }
    const parts: string[] = [];
    if (sale.departmentIds?.length) {
      parts.push(`${sale.departmentIds.length} department(s)`);
    }
    if (sale.categoryIds?.length) {
      parts.push(`${sale.categoryIds.length} categor${sale.categoryIds.length === 1 ? 'y' : 'ies'}`);
    }
    if (sale.productIds?.length) {
      parts.push(`${sale.productIds.length} product(s)`);
    }
    return parts.join(' + ') || 'No targets';
  }

  setScopeDepartment(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    const parsed = target.value === '' ? null : Number(target.value);
    this.scopeDepartmentId.set(parsed);
    this.scopeCategoryId.set(null);
    this.loadCategories();
    this.refreshPicker();
  }

  setScopeCategory(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    this.scopeCategoryId.set(target.value === '' ? null : Number(target.value));
    this.refreshPicker();
  }

  setApplyMode(mode: ApplyMode): void {
    this.applyMode.set(mode);
    if (mode === 'specific') {
      this.refreshPicker();
    }
  }

  scopeCategories(): CategoryDto[] {
    const dept = this.scopeDepartmentId();
    return this.categories().filter((c) => dept === null || c.departmentId === dept);
  }

  refreshPicker(): void {
    if (this.applyMode() !== 'specific') {
      return;
    }
    const category = this.categories().find((c) => c.categoryId === this.scopeCategoryId());
    const department = this.departments().find((d) => d.departmentId === this.scopeDepartmentId());
    const search = this.productSearch.value.trim() || undefined;
    this.pickerLoading.set(true);
    this.catalog.getProducts({
      Department: department?.slug,
      Category: category?.slug,
      Search: search,
      PageSize: 100,
    }).subscribe({
      next: (page) => {
        this.pickerProducts.set(page.items);
        this.pickerLoading.set(false);
      },
      error: () => {
        this.pickerProducts.set([]);
        this.pickerLoading.set(false);
      },
    });
  }

  toggleProduct(product: ProductCardDto): void {
    this.selectedProducts.update((map) => {
      const next = new Map(map);
      if (next.has(product.productId)) {
        next.delete(product.productId);
      } else {
        next.set(product.productId, product.name);
      }
      return next;
    });
  }

  isSelected(productId: number): boolean {
    return this.selectedProducts().has(productId);
  }

  selectAllVisible(): void {
    this.selectedProducts.update((map) => {
      const next = new Map(map);
      for (const product of this.pickerProducts()) {
        next.set(product.productId, product.name);
      }
      return next;
    });
  }

  clearSelected(): void {
    this.selectedProducts.set(new Map());
  }

  deselectProduct(id: number): void {
    this.selectedProducts.update((map) => {
      const next = new Map(map);
      next.delete(id);
      return next;
    });
  }

  selectedList(): { id: number; name: string }[] {
    return [...this.selectedProducts().entries()].map(([id, name]) => ({ id, name }));
  }

  createMode(): void {
    this.editingSaleId.set(null);
    this.form.reset({ name: '', discountType: 'Percentage', discountValue: null, startsAt: '', endsAt: '' });
    this.scopeDepartmentId.set(null);
    this.scopeCategoryId.set(null);
    this.applyMode.set('all');
    this.selectedProducts.set(new Map());
    this.productSearch.setValue('');
    this.error.set('');
    this.editing.set(true);
  }

  private openCreateForProduct(productId: number): void {
    this.createMode();
    this.applyMode.set('specific');
    this.admin.getProduct(productId).subscribe({
      next: (product) => {
        this.selectedProducts.set(new Map([[product.productId, product.name]]));
        this.form.controls.name.setValue(`${product.name} offer`);
        this.message.set(`Promotion pre-filled for "${product.name}".`);
      },
      error: () => this.selectedProducts.set(new Map([[productId, `Product #${productId}`]])),
    });
    this.refreshPicker();
  }

  editSale(sale: SaleDto): void {
    this.editingSaleId.set(sale.saleId);
    this.form.reset({
      name: sale.name,
      discountType: sale.discountType === 'FixedAmount' ? 'FixedAmount' : 'Percentage',
      discountValue: sale.discountValue,
      startsAt: toLocalInput(sale.startsAt),
      endsAt: toLocalInput(sale.endsAt),
    });
    this.selectedProducts.set(new Map((sale.productIds ?? []).map((id) => [id, `Product #${id}`])));
    this.applyMode.set(sale.applyToAll || (sale.departmentIds?.length ?? 0) > 0 || (sale.categoryIds?.length ?? 0) > 0 ? 'all' : 'specific');
    if (sale.categoryIds?.length) {
      const category = this.categories().find((c) => c.categoryId === sale.categoryIds![0]);
      this.scopeDepartmentId.set(category?.departmentId ?? null);
      this.scopeCategoryId.set(sale.categoryIds[0]);
    } else if (sale.departmentIds?.length) {
      this.scopeDepartmentId.set(sale.departmentIds[0]);
      this.scopeCategoryId.set(null);
    } else {
      this.scopeDepartmentId.set(null);
      this.scopeCategoryId.set(null);
    }
    this.error.set('');
    this.editing.set(true);
    this.refreshPicker();
  }

  create(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    if (this.form.invalid || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    const specific = this.applyMode() === 'specific';
    const productIds = specific ? [...this.selectedProducts().keys()] : [];
    if (specific && productIds.length === 0) {
      this.error.set('Choose at least one product in the selection grid.');
      return;
    }
    const categoryId = this.scopeCategoryId();
    const departmentId = this.scopeDepartmentId();
    const request: SaleWriteRequest = {
      name: value.name.trim(),
      discountType: value.discountType,
      discountValue: value.discountValue ?? 0,
      startsAt: value.startsAt ? new Date(value.startsAt).toISOString() : null,
      endsAt: value.endsAt ? new Date(value.endsAt).toISOString() : null,
      productIds,
      categoryIds: !specific && categoryId !== null ? [categoryId] : [],
      departmentIds: !specific && categoryId === null && departmentId !== null ? [departmentId] : [],
      applyToAll: !specific && categoryId === null && departmentId === null,
    };
    this.saving.set(true);
    const id = this.editingSaleId();
    const call = id === null
      ? this.admin.createSale(request)
      : this.admin.updateSale(id, request);
    call.subscribe({
      next: () => {
        this.message.set(id === null ? 'Promotion created.' : 'Promotion updated.');
        this.saving.set(false);
        this.editing.set(false);
        this.editingSaleId.set(null);
        this.load();
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Promotion could not be saved.').message);
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

  private loadCategories(): void {
    this.admin.getCategories().subscribe({
      next: (categories) => this.categories.set(categories.filter((c) => c.isActive && !c.isDeleted)),
    });
  }
}

function toLocalInput(iso: string | null): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

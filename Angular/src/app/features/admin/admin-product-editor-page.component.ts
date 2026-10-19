import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CategoryWriteRequest } from '../../core/models/admin.models';
import { CategoryDto, DepartmentDto, ProductDetailDto } from '../../core/models/catalog.models';
import { ProductAttributeDefinitionDto } from '../../core/models/admin.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

interface ProductAttributeDraft {
  slug: string;
  value: string;
}

@Component({
  selector: 'tcs-admin-product-editor-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="admin-page">
      <div class="admin-page-heading">
        <div><p class="eyebrow">Catalog / Products</p><h1 class="page-title">{{ productId() ? 'Edit product.' : 'Create product.' }}</h1></div>
        <a class="text-link" routerLink="/admin/products">← Product list</a>
      </div>
      @if (loadError()) { <div class="notice notice-error" role="alert">{{ loadError() }}</div> }
      @if (loading()) { <div class="state-panel"><span class="spinner" aria-label="Loading product"></span></div> }
      @else {
        @if (error()) { <div class="notice notice-error" role="alert">{{ error() }}</div> }
        @if (message()) { <div class="notice notice-success" role="status">{{ message() }}</div> }
        <form class="admin-form-card" [formGroup]="form" (ngSubmit)="save()" novalidate>
          <h2>Product information</h2>
          <div class="admin-form-grid">
            <div class="field"><label for="product-name">Name</label><input id="product-name" class="control" formControlName="name"></div>
            <div class="field"><label for="product-slug">Slug</label><input id="product-slug" class="control" formControlName="slug"></div>
          </div>
          <div class="admin-form-grid">
            <div class="field"><label for="product-brand">Brand</label><input id="product-brand" class="control" formControlName="brand"></div>
            <div class="field">
              <label for="product-status">Status</label>
              <select id="product-status" class="control" formControlName="status">
                <option value="Draft">Draft</option><option value="Active">Active</option><option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div class="field"><label for="product-description">Description</label><textarea id="product-description" class="control" rows="5" formControlName="description"></textarea></div>
          @if (form.controls.name.touched && form.controls.name.invalid) { <span class="field-error">Enter a product name (2-200 characters).</span> }
          @if (form.controls.slug.touched && form.controls.slug.invalid) { <span class="field-error">Enter a product slug (2-220 characters).</span> }

          <section class="admin-form-section">
            <div><h2>Departments</h2><p>Choose one or more active departments.</p></div>
            @if (referenceError()) { <p class="field-error">{{ referenceError() }}</p> }
            <div class="admin-checklist">
              @for (department of departments(); track department.departmentId) {
                <label><input type="checkbox" [checked]="hasDepartment(department.departmentId)" (change)="toggleDepartment(department.departmentId, $event)">{{ department.name }}</label>
              }
            </div>
          </section>

          <section class="admin-form-section">
            <div><h2>Categories</h2><p>Categories must belong to a selected department.</p></div>
            <div class="admin-checklist">
              @for (category of availableCategories(); track category.categoryId) {
                <label><input type="checkbox" [checked]="hasCategory(category.categoryId)" (change)="toggleCategory(category.categoryId, $event)">{{ category.name }} <small>{{ departmentName(category.departmentId) }}</small></label>
              }
              @if (availableCategories().length === 0) { <span class="muted-copy">Select a department to see categories.</span> }
            </div>
          </section>

          <section class="admin-form-section">
            <div class="admin-form-section__head">
              <div><h2>Descriptive attributes</h2><p>Examples: fabric, fit, material or fragrance family.</p></div>
            </div>
            <div class="admin-form-grid">
              <div class="field">
                <label for="attribute-definition">Attribute</label>
                <select id="attribute-definition" class="control" [formControl]="attributeSlug">
                  <option value="">Choose an attribute</option>
                  @for (attribute of attributes(); track attribute.productAttributeId) {
                    <option [value]="attribute.slug">{{ attribute.name }}</option>
                  }
                </select>
              </div>
              <div class="field"><label for="attribute-value">Value</label><input id="attribute-value" class="control" [formControl]="attributeValue" placeholder="e.g. Cotton"></div>
            </div>
            <button class="btn btn-outline btn-small" type="button" (click)="addAttribute()" [disabled]="!attributeSlug.value || !attributeValue.value.trim()">Add attribute</button>
            <div class="admin-attribute-list">
              @for (attribute of attributeDrafts(); track attribute.slug) {
                <div><span><strong>{{ attribute.slug }}</strong> · {{ attribute.value }}</span><button class="text-button" type="button" (click)="removeAttribute(attribute.slug)">Remove</button></div>
              }
            </div>
          </section>

          <div class="admin-form-actions">
            <button class="btn btn-primary" type="submit" [disabled]="saving() || departments().length === 0">
              {{ saving() ? 'Saving…' : 'Save product' }}
            </button>
            <a class="btn btn-outline" routerLink="/admin/products">Cancel</a>
          </div>
        </form>
      }
    </section>
  `,
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProductEditorPageComponent implements OnInit {
  readonly productId = signal<number | null>(null);
  readonly product = signal<ProductDetailDto | null>(null);
  readonly departments = signal<DepartmentDto[]>([]);
  readonly categories = signal<CategoryDto[]>([]);
  readonly attributes = signal<ProductAttributeDefinitionDto[]>([]);
  readonly selectedDepartments = signal<number[]>([]);
  readonly selectedCategories = signal<number[]>([]);
  readonly attributeDrafts = signal<ProductAttributeDraft[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly loadError = signal('');
  readonly referenceError = signal('');
  readonly message = signal('');
  readonly attributeSlug = new FormControl('', { nonNullable: true });
  readonly attributeValue = new FormControl('', { nonNullable: true });
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(200)] }),
    slug: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(220)] }),
    brand: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(120)] }),
    status: new FormControl<'Draft' | 'Active' | 'Inactive'>('Draft', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly admin: AdminApiService,
  ) {}

  ngOnInit(): void {
    this.loadReferences();
    const id = parseId(this.route.snapshot.paramMap.get('id'));
    this.productId.set(id);
    if (id === null) {
      this.loading.set(false);
      return;
    }
    this.admin.getProduct(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.form.patchValue({
          name: product.name,
          slug: product.slug,
          brand: product.brand ?? '',
          status: toProductStatus(product.status),
          description: product.description ?? '',
        });
        this.selectedDepartments.set(product.departments.map((item) => item.departmentId));
        this.selectedCategories.set(product.categories.map((item) => item.categoryId));
        this.attributeDrafts.set(product.attributes.map((item) => ({ slug: item.slug, value: item.value })));
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.loadError.set(parseApiFailure(failure, 'The product could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  availableCategories(): CategoryDto[] {
    const selected = this.selectedDepartments();
    return this.categories().filter((category) =>
      selected.includes(category.departmentId) && category.isActive && !category.isDeleted);
  }

  hasDepartment(id: number): boolean {
    return this.selectedDepartments().includes(id);
  }

  hasCategory(id: number): boolean {
    return this.selectedCategories().includes(id);
  }

  toggleDepartment(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    const next = new Set(this.selectedDepartments());
    checked ? next.add(id) : next.delete(id);
    this.selectedDepartments.set([...next]);
    this.selectedCategories.set(this.selectedCategories().filter((categoryId) =>
      this.categories().some((category) => category.categoryId === categoryId && next.has(category.departmentId))));
  }

  toggleCategory(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    const next = new Set(this.selectedCategories());
    checked ? next.add(id) : next.delete(id);
    this.selectedCategories.set([...next]);
  }

  departmentName(id: number): string {
    return this.departments().find((department) => department.departmentId === id)?.name ?? '';
  }

  addAttribute(): void {
    const slug = this.attributeSlug.value.trim();
    const value = this.attributeValue.value.trim();
    if (!slug || !value || this.attributeDrafts().some((item) => item.slug === slug)) {
      return;
    }
    this.attributeDrafts.update((items) => [...items, { slug, value }]);
    this.attributeSlug.setValue('');
    this.attributeValue.setValue('');
  }

  removeAttribute(slug: string): void {
    this.attributeDrafts.update((items) => items.filter((item) => item.slug !== slug));
  }

  save(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    this.message.set('');
    if (this.form.invalid || this.selectedDepartments().length === 0 || this.saving()) {
      if (this.selectedDepartments().length === 0) {
        this.error.set('Select at least one department.');
      }
      return;
    }
    const value = this.form.getRawValue();
    const request = {
      name: value.name.trim(),
      slug: value.slug.trim(),
      description: value.description.trim() || null,
      brand: value.brand.trim() || null,
      status: value.status,
      departmentIds: this.selectedDepartments(),
      categoryIds: this.selectedCategories(),
      attributes: this.attributeDrafts(),
    };
    this.saving.set(true);
    const id = this.productId();
    const operation = id === null
      ? this.admin.createProduct(request)
      : this.admin.updateProduct(id, request);
    operation.subscribe({
      next: (product) => {
        this.saving.set(false);
        this.message.set('Product saved.');
        if (id === null) {
          void this.router.navigate(['/admin/products', product.productId, 'edit']);
        } else {
          this.product.set(product);
        }
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Product could not be saved.').message);
        this.saving.set(false);
      },
    });
  }

  private loadReferences(): void {
    this.admin.getDepartments().subscribe({
      next: (items) => this.departments.set(items.filter((item) => item.isActive)),
      error: (failure: unknown) => this.referenceError.set(parseApiFailure(failure, 'Departments could not be loaded.').message),
    });
    this.admin.getCategories().subscribe({
      next: (items) => this.categories.set(items),
      error: (failure: unknown) => this.referenceError.set(parseApiFailure(failure, 'Categories could not be loaded.').message),
    });
    this.admin.getAttributes().subscribe({
      next: (items) => this.attributes.set(items.filter((item) => item.isActive)),
      error: (failure: unknown) => this.referenceError.set(parseApiFailure(failure, 'Attributes could not be loaded.').message),
    });
  }
}

function parseId(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function toProductStatus(value: string): 'Draft' | 'Active' | 'Inactive' {
  return value === 'Active' || value === 'Inactive' ? value : 'Draft';
}

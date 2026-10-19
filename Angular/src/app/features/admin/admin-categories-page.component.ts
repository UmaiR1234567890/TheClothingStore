import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryWriteRequest } from '../../core/models/admin.models';
import { CategoryDto, DepartmentDto } from '../../core/models/catalog.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-categories-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="admin-page">
      <div class="admin-page-heading">
        <div><p class="eyebrow">Catalog / Taxonomy</p><h1 class="page-title">Categories.</h1></div>
        <button class="btn btn-primary" type="button" (click)="createMode()">Add category</button>
      </div>
      @if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
      @if (message()) { <p class="notice notice-success" role="status">{{ message() }}</p> }
      @if (loading()) { <div class="state-panel"><span class="spinner" aria-label="Loading categories"></span></div> }
      @else {
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Category</th><th>Department</th><th>Parent</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              @for (category of categories(); track category.categoryId) {
                <tr>
                  <td><strong>{{ category.name }}</strong><small>{{ category.slug }} · #{{ category.categoryId }}</small></td>
                  <td>{{ departmentName(category.departmentId) }}</td>
                  <td>{{ parentName(category.parentCategoryId) }}</td>
                  <td><span class="admin-badge" [class.admin-badge--inactive]="!category.isActive || category.isDeleted">{{ category.isDeleted ? 'Deleted' : category.isActive ? 'Active' : 'Inactive' }}</span></td>
                  <td><div class="admin-inline-actions">
                    <button type="button" (click)="edit(category)">Edit</button>
                    @if (!category.isDeleted) {
                      <button type="button" (click)="setStatus(category, category.isActive ? 'Inactive' : 'Active')">{{ category.isActive ? 'Deactivate' : 'Activate' }}</button>
                      <button type="button" (click)="remove(category)">Soft delete</button>
                    }
                  </div></td>
                </tr>
              } @empty { <tr><td colspan="5">No categories found.</td></tr> }
            </tbody>
          </table>
        </div>
      }

      @if (editing()) {
        <form class="admin-form-card" [formGroup]="form" (ngSubmit)="save()">
          <h2>{{ editingId() ? 'Edit category' : 'Create category' }}</h2>
          <div class="admin-form-grid">
            <div class="field">
              <label for="category-department">Department</label>
              <select id="category-department" class="control" formControlName="departmentId" (change)="clearInvalidParent()">
                <option [ngValue]="null">Choose department</option>
                @for (department of departments(); track department.departmentId) {
                  <option [ngValue]="department.departmentId">{{ department.name }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label for="category-parent">Parent category <span class="field-optional">Optional</span></label>
              <select id="category-parent" class="control" formControlName="parentCategoryId">
                <option [ngValue]="null">Top-level category</option>
                @for (parent of parentOptions(); track parent.categoryId) {
                  <option [ngValue]="parent.categoryId">{{ parent.name }}</option>
                }
              </select>
            </div>
          </div>
          <div class="admin-form-grid">
            <div class="field"><label for="category-name">Name</label><input id="category-name" class="control" formControlName="name"></div>
            <div class="field"><label for="category-slug">Slug</label><input id="category-slug" class="control" formControlName="slug"></div>
          </div>
          <div class="field"><label for="category-order">Sort order</label><input id="category-order" class="control" type="number" min="0" formControlName="sortOrder"></div>
          <p class="muted-copy">The server validates that the parent is in the same department and does not create a cycle.</p>
          <div class="admin-form-actions">
            <button class="btn btn-primary" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save category' }}</button>
            <button class="btn btn-outline" type="button" (click)="cancel()">Cancel</button>
          </div>
        </form>
      }
    </section>
  `,
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCategoriesPageComponent implements OnInit {
  readonly categories = signal<CategoryDto[]>([]);
  readonly departments = signal<DepartmentDto[]>([]);
  readonly editing = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly form = new FormGroup({
    departmentId: new FormControl<number | null>(null, Validators.required),
    parentCategoryId: new FormControl<number | null>(null),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    slug: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(160)] }),
    sortOrder: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
  });

  constructor(private readonly admin: AdminApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin.getDepartments().subscribe({
      next: (items) => this.departments.set(items),
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'Departments could not be loaded.').message),
    });
    this.admin.getCategories().subscribe({
      next: (items) => {
        this.categories.set(items);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Categories could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  parentOptions(): CategoryDto[] {
    const departmentId = this.form.controls.departmentId.value;
    const selfId = this.editingId();
    return this.categories().filter((category) =>
      category.isActive &&
      !category.isDeleted &&
      category.departmentId === departmentId &&
      category.categoryId !== selfId);
  }

  departmentName(id: number): string {
    return this.departments().find((department) => department.departmentId === id)?.name ?? `#${id}`;
  }

  parentName(id: number | null): string {
    if (id === null) {
      return '—';
    }
    return this.categories().find((category) => category.categoryId === id)?.name ?? `#${id}`;
  }

  createMode(): void {
    this.editingId.set(null);
    this.form.reset({ departmentId: null, parentCategoryId: null, name: '', slug: '', sortOrder: 0 });
    this.editing.set(true);
    this.error.set('');
  }

  edit(category: CategoryDto): void {
    this.editingId.set(category.categoryId);
    this.form.patchValue({
      departmentId: category.departmentId,
      parentCategoryId: category.parentCategoryId,
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder,
    });
    this.editing.set(true);
    this.error.set('');
  }

  clearInvalidParent(): void {
    const currentParent = this.form.controls.parentCategoryId.value;
    if (currentParent !== null && !this.parentOptions().some((item) => item.categoryId === currentParent)) {
      this.form.controls.parentCategoryId.setValue(null);
    }
  }

  cancel(): void {
    this.editing.set(false);
    this.editingId.set(null);
  }

  save(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    if (this.form.invalid || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    const request: CategoryWriteRequest = {
      departmentId: value.departmentId!,
      parentCategoryId: value.parentCategoryId,
      name: value.name.trim(),
      slug: value.slug.trim(),
      sortOrder: value.sortOrder,
    };
    this.saving.set(true);
    const id = this.editingId();
    const operation = id === null ? this.admin.createCategory(request) : this.admin.updateCategory(id, request);
    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set('Category saved.');
        this.editing.set(false);
        this.editingId.set(null);
        this.load();
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Category could not be saved.').message);
        this.saving.set(false);
      },
    });
  }

  setStatus(category: CategoryDto, status: string): void {
    this.admin.setCategoryStatus(category.categoryId, status).subscribe({
      next: () => this.load(),
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'Category status could not be updated.').message),
    });
  }

  remove(category: CategoryDto): void {
    if (!window.confirm(`Soft-delete “${category.name}”?`)) {
      return;
    }
    this.admin.deleteCategory(category.categoryId).subscribe({
      next: () => this.load(),
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'Category could not be deleted.').message),
    });
  }
}

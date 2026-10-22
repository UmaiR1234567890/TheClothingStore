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
  templateUrl: './admin-categories-page.component.html',
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

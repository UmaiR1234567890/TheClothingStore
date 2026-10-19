import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductAttributeDefinitionDto } from '../../core/models/admin.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-attributes-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="admin-page">
      <div class="admin-page-heading">
        <div><p class="eyebrow">Catalog / Product details</p><h1 class="page-title">Attributes.</h1></div>
        <button class="btn btn-primary" type="button" (click)="createMode()">Add attribute</button>
      </div>
      <p class="page-intro">Definitions such as fabric, fit, material, or fragrance family. Product values remain descriptive and separate from variant options.</p>
      @if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
      @if (message()) { <p class="notice notice-success" role="status">{{ message() }}</p> }
      @if (loading()) { <div class="state-panel"><span class="spinner" aria-label="Loading attributes"></span></div> }
      @else {
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Name</th><th>Slug</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              @for (attribute of attributes(); track attribute.productAttributeId) {
                <tr>
                  <td><strong>{{ attribute.name }}</strong></td><td>{{ attribute.slug }}</td>
                  <td><span class="admin-badge" [class.admin-badge--inactive]="!attribute.isActive">{{ attribute.isActive ? 'Active' : 'Inactive' }}</span></td>
                  <td><div class="admin-inline-actions">
                    <button type="button" (click)="edit(attribute)">Edit</button>
                    <button type="button" (click)="setStatus(attribute, attribute.isActive ? 'Inactive' : 'Active')">{{ attribute.isActive ? 'Deactivate' : 'Activate' }}</button>
                  </div></td>
                </tr>
              } @empty { <tr><td colspan="4">No attribute definitions found.</td></tr> }
            </tbody>
          </table>
        </div>
      }

      @if (editing()) {
        <form class="admin-form-card" [formGroup]="form" (ngSubmit)="save()">
          <h2>{{ editingId() ? 'Edit definition' : 'Create definition' }}</h2>
          <div class="admin-form-grid">
            <div class="field"><label for="attribute-name">Name</label><input id="attribute-name" class="control" formControlName="name"></div>
            <div class="field"><label for="attribute-slug">Slug</label><input id="attribute-slug" class="control" formControlName="slug"></div>
          </div>
          <div class="admin-form-actions">
            <button class="btn btn-primary" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save definition' }}</button>
            <button class="btn btn-outline" type="button" (click)="editing.set(false)">Cancel</button>
          </div>
        </form>
      }
    </section>
  `,
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAttributesPageComponent implements OnInit {
  readonly attributes = signal<ProductAttributeDefinitionDto[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly error = signal('');
  readonly message = signal('');
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
    slug: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
  });

  constructor(private readonly admin: AdminApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin.getAttributes().subscribe({
      next: (items) => {
        this.attributes.set(items);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Attribute definitions could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  createMode(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', slug: '' });
    this.editing.set(true);
  }

  edit(attribute: ProductAttributeDefinitionDto): void {
    this.editingId.set(attribute.productAttributeId);
    this.form.patchValue({ name: attribute.name, slug: attribute.slug });
    this.editing.set(true);
  }

  save(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    if (this.form.invalid || this.saving()) {
      return;
    }
    const request = {
      name: this.form.controls.name.value.trim(),
      slug: this.form.controls.slug.value.trim(),
    };
    const id = this.editingId();
    this.saving.set(true);
    const operation = id === null ? this.admin.createAttribute(request) : this.admin.updateAttribute(id, request);
    operation.subscribe({
      next: () => {
        this.message.set('Attribute definition saved.');
        this.editing.set(false);
        this.editingId.set(null);
        this.saving.set(false);
        this.load();
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Attribute definition could not be saved.').message);
        this.saving.set(false);
      },
    });
  }

  setStatus(attribute: ProductAttributeDefinitionDto, status: string): void {
    this.admin.setAttributeStatus(attribute.productAttributeId, status).subscribe({
      next: () => this.load(),
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'Attribute status could not be updated.').message),
    });
  }
}

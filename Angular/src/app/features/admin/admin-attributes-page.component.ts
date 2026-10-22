import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductAttributeDefinitionDto } from '../../core/models/admin.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-attributes-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-attributes-page.component.html',
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

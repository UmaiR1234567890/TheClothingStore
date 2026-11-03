import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ColorOptionDto } from '../../core/models/catalog.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-colors-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-colors-page.component.html',
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminColorsPageComponent implements OnInit {
  readonly colors = signal<ColorOptionDto[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly deleting = signal<ColorOptionDto | null>(null);
  readonly deletingBusy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
    hexCode: new FormControl('#000000', { nonNullable: true, validators: [Validators.pattern(/^#[0-9a-fA-F]{6}$/)] }),
  });

  constructor(private readonly admin: AdminApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin.getColors().subscribe({
      next: (items) => {
        this.colors.set(items);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Colors could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  createMode(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', hexCode: '#000000' });
    this.editing.set(true);
  }

  edit(color: ColorOptionDto): void {
    this.editingId.set(color.colorId);
    this.form.patchValue({ name: color.name, hexCode: color.hexCode ?? '#000000' });
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
      hexCode: this.form.controls.hexCode.value,
      sortOrder: 0,
      isActive: true,
    };
    const id = this.editingId();
    this.saving.set(true);
    const operation = id === null ? this.admin.createColor(request) : this.admin.updateColor(id, request);
    operation.subscribe({
      next: () => {
        this.message.set('Color saved.');
        this.editing.set(false);
        this.editingId.set(null);
        this.saving.set(false);
        this.load();
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Color could not be saved.').message);
        this.saving.set(false);
      },
    });
  }

  toggleActive(color: ColorOptionDto): void {
    this.error.set('');
    this.admin.updateColor(color.colorId, {
      name: color.name, hexCode: color.hexCode, sortOrder: color.sortOrder, isActive: !color.isActive,
    }).subscribe({
      next: () => this.load(),
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'Color status could not be updated.').message),
    });
  }

  askDelete(color: ColorOptionDto): void {
    this.deleting.set(color);
  }

  cancelDelete(): void {
    this.deleting.set(null);
  }

  confirmDelete(): void {
    const color = this.deleting();
    if (!color || this.deletingBusy()) {
      return;
    }
    this.deletingBusy.set(true);
    this.error.set('');
    this.admin.deleteColor(color.colorId).subscribe({
      next: () => {
        this.message.set(`"${color.name}" permanently deleted.`);
        this.deleting.set(null);
        this.deletingBusy.set(false);
        this.load();
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Color could not be deleted.').message);
        this.deleting.set(null);
        this.deletingBusy.set(false);
      },
    });
  }
}

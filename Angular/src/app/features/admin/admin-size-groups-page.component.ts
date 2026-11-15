import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SizeGroupDto, SizeOptionDto } from '../../core/models/catalog.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-size-groups-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-size-groups-page.component.html',
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSizeGroupsPageComponent implements OnInit {
  readonly groups = signal<SizeGroupDto[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly deleting = signal<SizeGroupDto | null>(null);
  readonly deletingBusy = signal(false);
  readonly renaming = signal<{ groupId: number; sizeId: number; name: string } | null>(null);
  readonly itemDrafts = signal<Record<number, string>>({});
  readonly error = signal('');
  readonly errorModal = signal('');

  closeErrorModal(): void {
    this.errorModal.set('');
  }
  readonly message = signal('');
  readonly form = new FormGroup({
    groupName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
  });

  constructor(private readonly admin: AdminApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin.getSizeGroups().subscribe({
      next: (items) => {
        this.groups.set(items);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Size groups could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  createMode(): void {
    this.editingId.set(null);
    this.form.reset({ groupName: '' });
    this.editing.set(true);
  }

  edit(group: SizeGroupDto): void {
    this.editingId.set(group.sizeGroupId);
    this.form.patchValue({ groupName: group.groupName });
    this.editing.set(true);
  }

  save(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    if (this.form.invalid || this.saving()) {
      return;
    }
    const request = { groupName: this.form.controls.groupName.value.trim(), sortOrder: 0, isActive: true };
    const id = this.editingId();
    this.saving.set(true);
    const operation = id === null ? this.admin.createSizeGroup(request) : this.admin.updateSizeGroup(id, request);
    operation.subscribe({
      next: () => {
        this.message.set('Size group saved.');
        this.editing.set(false);
        this.editingId.set(null);
        this.saving.set(false);
        this.load();
      },
      error: (failure: unknown) => {
        this.errorModal.set(parseApiFailure(failure, 'Size group could not be saved.').message);
        this.saving.set(false);
      },
    });
  }

  askDelete(group: SizeGroupDto): void {
    this.deleting.set(group);
  }

  confirmDelete(): void {
    const group = this.deleting();
    if (!group || this.deletingBusy()) {
      return;
    }
    this.deletingBusy.set(true);
    this.error.set('');
    this.admin.deleteSizeGroup(group.sizeGroupId).subscribe({
      next: () => {
        this.message.set(`"${group.groupName}" permanently deleted.`);
        this.deleting.set(null);
        this.deletingBusy.set(false);
        this.load();
      },
      error: (failure: unknown) => {
        this.errorModal.set(parseApiFailure(failure, 'Size group could not be deleted.').message);
        this.deleting.set(null);
        this.deletingBusy.set(false);
      },
    });
  }

  setItemDraft(groupId: number, value: string): void {
    this.itemDrafts.update((map) => ({ ...map, [groupId]: value }));
  }

  addItem(groupId: number): void {
    const name = (this.itemDrafts()[groupId] ?? '').trim();
    if (!name) {
      return;
    }
    this.error.set('');
    this.admin.addSizeGroupItem(groupId, { name }).subscribe({
      next: () => {
        this.itemDrafts.update((map) => ({ ...map, [groupId]: '' }));
        this.load();
      },
      error: (failure: unknown) => this.errorModal.set(parseApiFailure(failure, 'Size could not be added.').message),
    });
  }

  startRename(groupId: number, size: SizeOptionDto): void {
    this.renaming.set({ groupId, sizeId: size.sizeId, name: size.name });
  }

  setRenameName(value: string): void {
    const current = this.renaming();
    if (current) {
      this.renaming.set({ ...current, name: value });
    }
  }

  saveRename(): void {
    const current = this.renaming();
    const name = current?.name.trim() ?? '';
    if (!current || !name) {
      this.renaming.set(null);
      return;
    }
    this.error.set('');
    this.admin.renameSizeGroupItem(current.groupId, current.sizeId, { name }).subscribe({
      next: () => {
        this.message.set(`Size renamed to "${name}".`);
        this.renaming.set(null);
        this.load();
      },
      error: (failure: unknown) => {
        this.errorModal.set(parseApiFailure(failure, 'Size could not be renamed.').message);
        this.renaming.set(null);
      },
    });
  }

  removeItem(groupId: number, sizeId: number): void {
    this.error.set('');
    this.admin.removeSizeGroupItem(groupId, sizeId).subscribe({
      next: () => this.load(),
      error: (failure: unknown) => this.errorModal.set(parseApiFailure(failure, 'Size could not be removed.').message),
    });
  }
}

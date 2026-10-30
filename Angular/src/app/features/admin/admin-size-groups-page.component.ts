import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SizeGroupDto } from '../../core/models/catalog.models';
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
  readonly error = signal('');
  readonly message = signal('');
  readonly itemDrafts = signal<Record<number, string>>({});
  readonly form = new FormGroup({
    groupName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
    sortOrder: new FormControl(0, { nonNullable: true }),
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
    this.form.reset({ groupName: '', sortOrder: 0 });
    this.editing.set(true);
  }

  edit(group: SizeGroupDto): void {
    this.editingId.set(group.sizeGroupId);
    this.form.patchValue({ groupName: group.groupName, sortOrder: group.sortOrder });
    this.editing.set(true);
  }

  save(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    if (this.form.invalid || this.saving()) {
      return;
    }
    const request = {
      groupName: this.form.controls.groupName.value.trim(),
      sortOrder: this.form.controls.sortOrder.value,
      isActive: true,
    };
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
        this.error.set(parseApiFailure(failure, 'Size group could not be saved.').message);
        this.saving.set(false);
      },
    });
  }

  removeGroup(group: SizeGroupDto): void {
    this.error.set('');
    this.admin.deleteSizeGroup(group.sizeGroupId).subscribe({
      next: () => {
        this.message.set(`"${group.groupName}" deleted.`);
        this.load();
      },
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'Size group could not be deleted.').message),
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
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'Size could not be added.').message),
    });
  }

  removeItem(groupId: number, sizeId: number): void {
    this.error.set('');
    this.admin.removeSizeGroupItem(groupId, sizeId).subscribe({
      next: () => this.load(),
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'Size could not be removed.').message),
    });
  }
}

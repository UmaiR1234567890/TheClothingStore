import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProductImageUploadMetadata } from '../../core/models/admin.models';
import { ProductDetailDto, ProductImageDto } from '../../core/models/catalog.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

interface SelectedImageFile {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'tcs-admin-images-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-images-page.component.html',
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminImagesPageComponent implements OnInit, OnDestroy {
  readonly productId = signal(0);
  readonly product = signal<ProductDetailDto | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly unavailableImages = signal<number[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly selectedFiles = signal<SelectedImageFile[]>([]);
  readonly draggingFile = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly form = new FormGroup({
    imageUrl: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500), urlOrPathValidator] }),
    altText: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
    displayOrder: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    isPrimary: new FormControl(false, { nonNullable: true }),
    colorId: new FormControl<number | null>(null),
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly admin: AdminApiService,
  ) {}

  ngOnDestroy(): void {
    this.releasePreviewUrls();
  }

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
    this.admin.getProduct(this.productId()).subscribe({
      next: (product) => {
        this.product.set(product);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Image references could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  markImageUnavailable(id: number): void {
    this.unavailableImages.update((ids) => ids.includes(id) ? ids : [...ids, id]);
  }

  isImageAvailable(id: number): boolean {
    return !this.unavailableImages().includes(id);
  }

  imageSource(path: string): string {
    return /^https?:\/\//i.test(path) || path.startsWith('/') ? path : `/${path}`;
  }

  onFileSelected(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      this.addFiles(input.files ? Array.from(input.files) : []);
      input.value = '';
    }
  }

  onFileDragOver(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile.set(true);
  }

  onFileDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile.set(false);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile.set(false);
    this.addFiles(event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : []);
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.update((files) => {
      URL.revokeObjectURL(files[index].previewUrl);
      return files.filter((_, i) => i !== index);
    });
  }

  clearSelectedFiles(): void {
    this.releasePreviewUrls();
    this.selectedFiles.set([]);
  }

  fileSize(file: File): string {
    const size = file.size;
    return size < 1024 * 1024
      ? `${Math.max(1, Math.round(size / 1024))} KB`
      : `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  sizesForColor(colorId: number | null): string[] {
    const names = new Set<string>();
    for (const variant of this.product()?.variants ?? []) {
      if (variant.isDeleted || variant.options.colorId !== colorId || !variant.options.sizeName) {
        continue;
      }
      names.add(variant.options.sizeName);
    }
    return [...names].sort((left, right) => left.localeCompare(right));
  }

  colorOptions(): Array<{ colorId: number; name: string }> {
    const colors = new Map<number, string>();
    for (const variant of this.product()?.variants ?? []) {
      if (!variant.isActive || variant.isDeleted) {
        continue;
      }
      const colorId = variant.options.colorId;
      const colorName = variant.options.colorName;
      if (colorId !== null && colorName) {
        colors.set(colorId, colorName);
      }
    }
    return [...colors.entries()]
      .map(([colorId, name]) => ({ colorId, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  canSaveImage(): boolean {
    if (this.form.invalid || this.saving()) {
      return false;
    }
    if (this.editingId() === null && this.selectedFiles().length === 0) {
      return false;
    }
    return !this.imageLimitReached();
  }

  imageLimitReached(): boolean {
    const colorId = this.form.controls.colorId.value;
    const groupCount = (this.product()?.images ?? [])
      .filter((image) => image.colorId === colorId && image.productImageId !== this.editingId())
      .length;
    return groupCount >= 5;
  }

  edit(image: ProductImageDto): void {
    this.clearSelectedFiles();
    this.editingId.set(image.productImageId);
    this.form.patchValue({
      imageUrl: image.imageUrl,
      altText: image.altText ?? '',
      displayOrder: image.displayOrder,
      isPrimary: image.isPrimary,
      colorId: image.colorId,
    });
  }

  reset(): void {
    this.clearSelectedFiles();
    this.editingId.set(null);
    this.form.reset({ imageUrl: '', altText: '', displayOrder: 0, isPrimary: false, colorId: null });
  }

  hasPrimaryForColor(colorId: number | null): boolean {
    return (this.product()?.images ?? []).some((image) => image.colorId === colorId && image.isPrimary);
  }

  async save(): Promise<void> {
    this.form.markAllAsTouched();
    this.error.set('');
    this.message.set('');
    if (this.form.invalid || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    const id = this.editingId();
    if (id === null && this.selectedFiles().length === 0) {
      this.error.set('Choose one or more image files, or drop them into the upload area.');
      return;
    }
    if (id !== null && !value.imageUrl.trim()) {
      this.error.set('The existing image path is missing.');
      return;
    }
    this.saving.set(true);
    try {
      if (id !== null) {
        await firstValueFrom(this.admin.updateImage(id, {
          altText: value.altText.trim() || null,
          displayOrder: value.displayOrder,
          isPrimary: value.isPrimary,
          colorId: value.colorId,
          imageUrl: value.imageUrl.trim(),
        }));
        this.message.set('Image reference saved.');
      } else {
        const files = this.selectedFiles();
        const markFirstPrimary = value.isPrimary || !this.hasPrimaryForColor(value.colorId);
        for (const [index, entry] of files.entries()) {
          const metadata: ProductImageUploadMetadata = {
            altText: files.length === 1
              ? (value.altText.trim() || null)
              : entry.file.name.replace(/\.[^.]+$/, ''),
            displayOrder: value.displayOrder + index,
            isPrimary: index === 0 && markFirstPrimary,
            colorId: value.colorId,
          };
          await firstValueFrom(this.admin.uploadImage(this.productId(), entry.file, metadata));
        }
        this.message.set(files.length === 1 ? 'Image uploaded.' : `${files.length} images uploaded.`);
      }
      this.saving.set(false);
      this.reset();
      this.load();
    } catch (failure) {
      this.error.set(parseApiFailure(failure, 'The image reference could not be saved.').message);
      this.saving.set(false);
      this.load();
    }
  }

  setPrimary(image: ProductImageDto): void {
    this.admin.setPrimaryImage(image.productImageId).subscribe({
      next: () => this.load(),
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'The primary image could not be changed.').message),
    });
  }

  remove(image: ProductImageDto): void {
    if (!window.confirm('Remove this image reference?')) {
      return;
    }
    this.admin.deleteImage(image.productImageId).subscribe({
      next: () => this.load(),
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'The image could not be removed.').message),
    });
  }

  private addFiles(files: File[]): void {
    this.error.set('');
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const accepted: SelectedImageFile[] = [];
    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension) || !allowedTypes.includes(file.type)) {
        this.error.set(`"${file.name}" was skipped — only JPEG, PNG, or WebP images are allowed.`);
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        this.error.set(`"${file.name}" was skipped — it is larger than 8 MB.`);
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    if (accepted.length > 0) {
      this.selectedFiles.update((current) => [...current, ...accepted]);
      if (!this.form.controls.altText.value.trim()) {
        this.form.controls.altText.setValue(accepted[0].file.name.replace(/\.[^.]+$/, ''));
      }
      if (this.selectedFiles().length > 1) {
        this.form.controls.isPrimary.setValue(true);
      }
    }
  }

  firstWillBePrimary(): boolean {
    return this.form.controls.isPrimary.value || !this.hasPrimaryForColor(this.form.controls.colorId.value);
  }

  private releasePreviewUrls(): void {
    for (const entry of this.selectedFiles()) {
      URL.revokeObjectURL(entry.previewUrl);
    }
  }
}

const urlOrPathValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (!value) {
    return null;
  }
  const isHttpUrl = /^https?:\/\/\S+$/i.test(value);
  const isLocalPath = value.startsWith('/') && !value.startsWith('//');
  return isHttpUrl || isLocalPath ? null : { urlOrPath: true };
};

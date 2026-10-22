import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductImageUploadMetadata } from '../../core/models/admin.models';
import { ProductDetailDto, ProductImageDto } from '../../core/models/catalog.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

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
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
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
    this.releasePreviewUrl();
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
      this.selectFile(input.files?.[0] ?? null);
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
    this.selectFile(event.dataTransfer?.files.item(0) ?? null);
  }

  clearSelectedFile(): void {
    this.selectFile(null);
  }

  selectedFileSize(): string {
    const size = this.selectedFile()?.size ?? 0;
    return size < 1024 * 1024
      ? `${Math.max(1, Math.round(size / 1024))} KB`
      : `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
    if (this.editingId() === null && this.selectedFile() === null) {
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
    this.clearSelectedFile();
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
    this.clearSelectedFile();
    this.editingId.set(null);
    this.form.reset({ imageUrl: '', altText: '', displayOrder: 0, isPrimary: false, colorId: null });
  }

  save(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    this.message.set('');
    if (this.form.invalid || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    const id = this.editingId();
    if (id === null && this.selectedFile() === null) {
      this.error.set('Choose an image file or drop it into the upload area.');
      return;
    }
    if (id !== null && !value.imageUrl.trim()) {
      this.error.set('The existing image path is missing.');
      return;
    }
    const metadata: ProductImageUploadMetadata = {
      altText: value.altText.trim() || null,
      displayOrder: value.displayOrder,
      isPrimary: value.isPrimary,
      colorId: value.colorId,
    };
    this.saving.set(true);
    const operation = id === null
      ? this.admin.uploadImage(this.productId(), this.selectedFile()!, metadata)
      : this.admin.updateImage(id, { ...metadata, imageUrl: value.imageUrl.trim() });
    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set('Image reference saved.');
        this.reset();
        this.load();
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'The image reference could not be saved.').message);
        this.saving.set(false);
      },
    });
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

  private selectFile(file: File | null): void {
    this.releasePreviewUrl();
    this.selectedFile.set(null);
    this.error.set('');
    if (!file) {
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!extension || !allowedExtensions.includes(extension) || !allowedTypes.includes(file.type)) {
      this.error.set('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      this.error.set('The image must be 8 MB or smaller.');
      return;
    }

    this.selectedFile.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
    if (!this.form.controls.altText.value.trim()) {
      this.form.controls.altText.setValue(file.name.replace(/\.[^.]+$/, ''));
    }
  }

  private releasePreviewUrl(): void {
    const url = this.previewUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.previewUrl.set(null);
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

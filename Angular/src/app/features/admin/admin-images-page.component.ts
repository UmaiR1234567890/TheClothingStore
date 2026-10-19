import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductDetailDto, ProductImageDto } from '../../core/models/catalog.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-images-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="admin-page">
      <div class="admin-page-heading">
        <div><p class="eyebrow">Products / Images</p><h1 class="page-title">Image references.</h1></div>
        <a class="text-link" [routerLink]="['/admin/products', productId(), 'edit']">← Edit product</a>
      </div>
      @if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
      @if (message()) { <p class="notice notice-success" role="status">{{ message() }}</p> }
      @if (loading()) { <div class="state-panel"><span class="spinner" aria-label="Loading image references"></span></div> }
      @else {
        @if (product(); as item) {
        <div class="admin-context-card"><strong>{{ item.name }}</strong><small>{{ item.slug }}</small></div>
        <p class="muted-copy">The current API stores image URLs or paths. File uploads are not supported here.</p>
        <div class="admin-image-grid">
          @for (image of item.images; track image.productImageId) {
            <article class="admin-image-card">
              @if (isImageAvailable(image.productImageId)) {
                <img [src]="imageSource(image.imageUrl)" [alt]="image.altText || item.name" (error)="markImageUnavailable(image.productImageId)">
              } @else {
                <span class="admin-image-preview admin-image-placeholder" aria-hidden="true">T</span>
              }
              <span class="admin-badge" [class.admin-badge--inactive]="!image.isPrimary">{{ image.isPrimary ? 'Primary' : 'Gallery' }}</span>
              <small>{{ image.altText || 'No alternative text' }} · Order {{ image.displayOrder }}</small>
              <div class="admin-inline-actions">
                @if (!image.isPrimary) { <button type="button" (click)="setPrimary(image)">Set primary</button> }
                <button type="button" (click)="edit(image)">Edit reference</button>
                <button type="button" (click)="remove(image)">Remove</button>
              </div>
            </article>
          } @empty {
            <div class="state-panel"><h2>No images</h2><p>Add a URL or path reference below.</p></div>
          }
        </div>

        <form class="admin-form-card" [formGroup]="form" (ngSubmit)="save()">
          <h2>{{ editingId() ? 'Edit image reference' : 'Add image reference' }}</h2>
          <div class="field"><label for="image-url">Image URL or path</label><input id="image-url" class="control" formControlName="imageUrl" placeholder="/images/products/example.jpg"></div>
          <div class="admin-form-grid">
            <div class="field"><label for="image-alt">Alternative text</label><input id="image-alt" class="control" formControlName="altText"></div>
            <div class="field"><label for="image-order">Display order</label><input id="image-order" class="control" type="number" min="0" formControlName="displayOrder"></div>
          </div>
          <label class="admin-check-row"><input type="checkbox" formControlName="isPrimary"> Set as primary image</label>
          <div class="admin-form-actions">
            <button class="btn btn-primary" type="submit" [disabled]="saving() || form.invalid">{{ saving() ? 'Saving…' : editingId() ? 'Save image' : 'Add image' }}</button>
            @if (editingId()) { <button class="btn btn-outline" type="button" (click)="reset()">Cancel edit</button> }
          </div>
        </form>
        }
      }
    </section>
  `,
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminImagesPageComponent implements OnInit {
  readonly productId = signal(0);
  readonly product = signal<ProductDetailDto | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly unavailableImages = signal<number[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly form = new FormGroup({
    imageUrl: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500), urlOrPathValidator] }),
    altText: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
    displayOrder: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    isPrimary: new FormControl(false, { nonNullable: true }),
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly admin: AdminApiService,
  ) {}

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

  edit(image: ProductImageDto): void {
    this.editingId.set(image.productImageId);
    this.form.patchValue({
      imageUrl: image.imageUrl,
      altText: image.altText ?? '',
      displayOrder: image.displayOrder,
      isPrimary: image.isPrimary,
    });
  }

  reset(): void {
    this.editingId.set(null);
    this.form.reset({ imageUrl: '', altText: '', displayOrder: 0, isPrimary: false });
  }

  save(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    this.message.set('');
    if (this.form.invalid || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    const request = {
      imageUrl: value.imageUrl.trim(),
      altText: value.altText.trim() || null,
      displayOrder: value.displayOrder,
      isPrimary: value.isPrimary,
    };
    this.saving.set(true);
    const id = this.editingId();
    const operation = id === null
      ? this.admin.createImage(this.productId(), request)
      : this.admin.updateImage(id, request);
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

import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { ProductCardDto, ProductDetailDto, ProductVariantDto } from '../../core/models/catalog.models';
import { ApiErrorDto } from '../../core/models/api.models';
import { CartApiService } from '../../core/services/cart-api.service';
import { CartStateService } from '../../core/services/cart-state.service';
import { CatalogApiService } from '../../core/services/catalog-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';
import { PageTitleService } from '../../core/services/page-title.service';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { findVariant } from '../../shared/utils/variant-selection';

interface OptionValue {
  id: number;
  label: string;
}

@Component({
  selector: 'tcs-product-detail-page',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, ProductCardComponent],
  template: `
    <section class="product-page container">
      @if (loading()) {
        <div class="product-detail-skeleton">
          <div class="product-detail-skeleton__image"></div>
          <div class="product-detail-skeleton__copy"></div>
        </div>
      } @else if (error()) {
        <div class="state-panel state-panel--error" role="alert">
          <h1>Product unavailable</h1>
          <p>{{ error() }}</p>
          <a class="btn btn-outline" routerLink="/">Back to the collection</a>
        </div>
      } @else {
        @if (product(); as item) {
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <a routerLink="/">Home</a><span>/</span>
          @if (item.departments.length > 0) {
            <a [routerLink]="['/', item.departments[0].slug]">{{ item.departments[0].name }}</a><span>/</span>
          }
          @if (item.categories.length > 0) {
            <a [routerLink]="['/category', item.categories[0].categoryId, item.categories[0].slug]">{{ item.categories[0].name }}</a><span>/</span>
          }
          <span aria-current="page">{{ item.name }}</span>
        </nav>

        <div class="product-detail">
          <div class="product-gallery">
            <div class="product-gallery__main">
              @if (activeImage() && !imageFailed()) {
                <img [src]="imageSource(activeImage()!.imageUrl)" [alt]="activeImage()!.altText || item.name" (error)="imageFailed.set(true)">
              } @else {
                <div class="product-gallery__fallback" aria-label="Product image unavailable">
                  <span>TCS</span><small>Image preview unavailable</small>
                </div>
              }
              @if (activeImage()?.isPrimary) {
                <span class="product-gallery__label">The detail</span>
              }
            </div>
            @if (item.images.length > 1) {
              <div class="product-gallery__thumbs" aria-label="Product images">
                @for (image of item.images; track image.productImageId) {
                  <button
                    type="button"
                    [class.is-selected]="activeImage()?.productImageId === image.productImageId"
                    [attr.aria-label]="image.altText || 'View product image'"
                    [attr.aria-pressed]="activeImage()?.productImageId === image.productImageId"
                    (click)="activeImage.set(image); imageFailed.set(false)">
                    <img [src]="imageSource(image.imageUrl)" [alt]="image.altText || item.name" loading="lazy">
                  </button>
                }
              </div>
            }
          </div>

          <div class="product-copy">
            <p class="eyebrow">{{ item.brand || (item.departments.length > 0 ? item.departments[0].name : 'The Clothing Store') }}</p>
            <h1>{{ item.name }}</h1>
            @if (selectedVariant(); as variant) {
              <div class="product-price">
                @if (variant.onSale) {
                  <span class="product-price__current">{{ variant.effectivePrice | currency:'PKR':'code':'1.0-2' }}</span>
                  <span class="product-price__regular">{{ variant.regularPrice | currency:'PKR':'code':'1.0-2' }}</span>
                  <span class="product-price__badge">Offer</span>
                } @else {
                  <span class="product-price__current">{{ variant.effectivePrice | currency:'PKR':'code':'1.0-2' }}</span>
                }
              </div>
            } @else if (item.variants.length > 0) {
              <p class="product-price__hint">Choose an option to see its price.</p>
            }

            @if (item.description) {
              <p class="product-description">{{ item.description }}</p>
            }

            @if (colorOptions().length > 0) {
              <fieldset class="option-group">
                <legend>Color <span>{{ selectedColorLabel() || '— choose —' }}</span></legend>
                <div class="option-list">
                  @for (option of colorOptions(); track option.id) {
                    <button
                      type="button"
                      class="option-chip"
                      [class.is-selected]="selectedColorId() === option.id"
                      [attr.aria-pressed]="selectedColorId() === option.id"
                      (click)="selectColor(option.id)">
                      {{ option.label }}
                    </button>
                  }
                </div>
              </fieldset>
            }

            @if (sizeOptions().length > 0) {
              <fieldset class="option-group">
                <legend>Size <span>{{ selectedSizeLabel() || '— choose —' }}</span></legend>
                <div class="option-list option-list--sizes">
                  @for (option of sizeOptions(); track option.id) {
                    <button
                      type="button"
                      class="option-chip"
                      [class.is-selected]="selectedSizeId() === option.id"
                      [disabled]="!hasOptionCombination(option.id, 'size')"
                      [attr.aria-pressed]="selectedSizeId() === option.id"
                      (click)="selectSize(option.id)">
                      {{ option.label }}
                    </button>
                  }
                </div>
              </fieldset>
            }

            @if (volumeOptions().length > 0) {
              <fieldset class="option-group">
                <legend>Volume <span>{{ selectedVolume() ? selectedVolume() + ' ml' : '— choose —' }}</span></legend>
                <div class="option-list option-list--sizes">
                  @for (volume of volumeOptions(); track volume) {
                    <button
                      type="button"
                      class="option-chip"
                      [class.is-selected]="selectedVolume() === volume"
                      [attr.aria-pressed]="selectedVolume() === volume"
                      (click)="selectVolume(volume)">
                      {{ volume }} ml
                    </button>
                  }
                </div>
              </fieldset>
            }

            @if (selectedVariant(); as variant) {
              <div class="variant-status" [class.variant-status--out]="!variant.isAvailable" aria-live="polite">
                <span class="variant-status__dot"></span>
                {{ variant.isAvailable ? variant.quantityAvailable + ' available' : 'Currently out of stock' }}
                <span class="variant-status__sku">SKU {{ variant.sku }}</span>
              </div>
              <div class="purchase-row">
                <label class="quantity-control">
                  <span class="sr-only">Quantity</span>
                  <button type="button" aria-label="Decrease quantity" [disabled]="quantity() <= 1" (click)="decreaseQuantity()">−</button>
                  <input type="number" min="1" [max]="Math.max(1, variant.quantityAvailable)" [value]="quantity()" (change)="setQuantity($event)">
                  <button type="button" aria-label="Increase quantity" [disabled]="quantity() >= variant.quantityAvailable" (click)="increaseQuantity(variant.quantityAvailable)">+</button>
                </label>
                <button
                  type="button"
                  class="btn btn-accent add-to-bag"
                  [disabled]="!variant.isAvailable || adding()"
                  (click)="addToCart(variant)">
                  {{ adding() ? 'Adding…' : variant.isAvailable ? 'Add to bag' : 'Unavailable' }}
                </button>
              </div>
              @if (cartMessage()) {
                <p class="notice notice-success" role="status">{{ cartMessage() }}</p>
              }
              @if (cartError()) {
                <p class="notice notice-error" role="alert">{{ cartError() }}</p>
              }
            } @else if (item.variants.length === 1) {
              <p class="variant-status">This option is unavailable.</p>
            } @else {
              <p class="variant-status">Select the available options to continue.</p>
            }

            <div class="product-attributes">
              <h2>Details</h2>
              @for (attribute of item.attributes; track attribute.slug) {
                <div class="product-attribute">
                  <span>{{ attribute.name }}</span><strong>{{ attribute.value }}</strong>
                </div>
              } @empty {
                <p class="product-description">Product details will be updated as they become available.</p>
              }
            </div>
          </div>
        </div>
        }
      }
    </section>

    @if (related().length > 0) {
      <section class="related-section container">
        <div class="section-heading">
          <div><p class="eyebrow">Continue exploring</p><h2 class="section-title">You may also like.</h2></div>
        </div>
        <div class="product-grid">
          @for (product of related(); track product.productId) {
            <tcs-product-card [product]="product" />
          }
        </div>
      </section>
    }
  `,
  styleUrl: './product-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailPageComponent implements OnInit {
  readonly product = signal<ProductDetailDto | null>(null);
  readonly activeImage = signal<ProductDetailDto['images'][number] | null>(null);
  readonly imageFailed = signal(false);
  readonly selectedColorId = signal<number | null>(null);
  readonly selectedSizeId = signal<number | null>(null);
  readonly selectedVolume = signal<number | null>(null);
  readonly quantity = signal(1);
  readonly loading = signal(true);
  readonly adding = signal(false);
  readonly error = signal('');
  readonly cartMessage = signal('');
  readonly cartError = signal('');
  readonly related = signal<ProductCardDto[]>([]);
  readonly selectedVariant = computed(() => this.matchingVariant());
  readonly colorOptions = computed(() => uniqueOptions(this.product()?.variants.map((variant) => ({
    id: variant.options.colorId,
    label: variant.options.colorName,
  })) ?? []));
  readonly sizeOptions = computed(() => uniqueOptions(this.product()?.variants.map((variant) => ({
    id: variant.options.sizeId,
    label: variant.options.sizeName,
  })) ?? []));
  readonly volumeOptions = computed(() => [...new Set(
    (this.product()?.variants ?? [])
      .map((variant) => variant.options.volumeMl)
      .filter((volume): volume is number => volume !== null),
  )].sort((a, b) => a - b));
  readonly Math = Math;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly catalog: CatalogApiService,
    private readonly cart: CartApiService,
    private readonly cartState: CartStateService,
    private readonly pageTitles: PageTitleService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap((params) => {
        const slug = params.get('slug');
        if (!slug) {
          this.error.set('A product was not selected.');
          this.loading.set(false);
          return of(null);
        }
        this.loading.set(true);
        this.error.set('');
        this.cartMessage.set('');
        return this.catalog.getProductBySlug(slug).pipe(catchError((failure: unknown) => {
          this.error.set(parseApiFailure(failure, 'This product could not be loaded.').message);
          return of(null);
        }));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((product) => {
      this.product.set(product);
      if (product) {
        this.pageTitles.set(product.name, product.description ?? `${product.name} from The Clothing Store.`);
      }
      this.activeImage.set(product?.images[0] ?? null);
      this.imageFailed.set(false);
      this.selectedColorId.set(null);
      this.selectedSizeId.set(null);
      this.selectedVolume.set(null);
      this.quantity.set(1);
      this.loading.set(false);
      if (product?.variants.length === 1) {
        this.selectVariant(product.variants[0]);
      }
      if (product?.categories.length) {
        this.loadRelated(product.categories[0].categoryId, product.productId);
      } else {
        this.related.set([]);
      }
    });
  }

  selectedColorLabel(): string | null {
    return this.colorOptions().find((option) => option.id === this.selectedColorId())?.label ?? null;
  }

  selectedSizeLabel(): string | null {
    return this.sizeOptions().find((option) => option.id === this.selectedSizeId())?.label ?? null;
  }

  selectColor(colorId: number): void {
    this.selectedColorId.set(colorId);
    if (this.selectedSizeId() !== null && !this.hasOptionCombination(this.selectedSizeId()!, 'size')) {
      this.selectedSizeId.set(null);
    }
    this.resetQuantity();
  }

  selectSize(sizeId: number): void {
    this.selectedSizeId.set(sizeId);
    this.resetQuantity();
  }

  selectVolume(volume: number): void {
    this.selectedVolume.set(volume);
    this.resetQuantity();
  }

  hasOptionCombination(id: number, kind: 'size' | 'color'): boolean {
    const currentColor = kind === 'color' ? id : this.selectedColorId();
    const currentSize = kind === 'size' ? id : this.selectedSizeId();
    return (this.product()?.variants ?? []).some((variant) =>
      (currentColor === null || variant.options.colorId === currentColor) &&
      (currentSize === null || variant.options.sizeId === currentSize));
  }

  setQuantity(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    const max = this.selectedVariant()?.quantityAvailable ?? 1;
    const parsed = Number(input.value);
    this.quantity.set(Number.isInteger(parsed) ? Math.max(1, Math.min(parsed, max || 1)) : 1);
  }

  decreaseQuantity(): void {
    this.quantity.update((value) => Math.max(1, value - 1));
  }

  increaseQuantity(available: number): void {
    this.quantity.update((value) => Math.min(available, value + 1));
  }

  addToCart(variant: ProductVariantDto): void {
    this.cartMessage.set('');
    this.cartError.set('');
    this.adding.set(true);
    this.cart.addItem({ productVariantId: variant.productVariantId, quantity: this.quantity() }).subscribe({
      next: (cart) => {
        this.cartState.setCount(cart.totalQuantity);
        this.cartMessage.set('Added to your bag.');
        this.adding.set(false);
      },
      error: (failure: unknown) => {
        this.cartError.set(parseApiFailure(failure, 'This item could not be added.').message);
        this.adding.set(false);
      },
    });
  }

  imageSource(path: string): string {
    return /^https?:\/\//i.test(path) || path.startsWith('/') ? path : `/${path}`;
  }

  private matchingVariant(): ProductVariantDto | null {
    return findVariant(this.product()?.variants ?? [], {
      colorId: this.selectedColorId(),
      sizeId: this.selectedSizeId(),
      volumeMl: this.selectedVolume(),
    });
  }

  private selectVariant(variant: ProductVariantDto): void {
    this.selectedColorId.set(variant.options.colorId);
    this.selectedSizeId.set(variant.options.sizeId);
    this.selectedVolume.set(variant.options.volumeMl);
  }

  private resetQuantity(): void {
    this.quantity.set(1);
    this.cartMessage.set('');
    this.cartError.set('');
  }

  private loadRelated(categoryId: number, currentProductId: number): void {
    this.catalog.getCategoryProducts(categoryId, 1, 5).subscribe({
      next: (page) => this.related.set(page.items.filter((item) => item.productId !== currentProductId).slice(0, 4)),
      error: () => this.related.set([]),
    });
  }
}

function uniqueOptions(options: Array<{ id: number | null; label: string | null }>): OptionValue[] {
  const found = new Map<number, string>();
  for (const option of options) {
    if (option.id !== null && option.label) {
      found.set(option.id, option.label);
    }
  }
  return [...found.entries()].map(([id, label]) => ({ id, label }));
}

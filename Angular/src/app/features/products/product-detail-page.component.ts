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
import { defaultColorIdForProduct, imagesForColor } from '../../shared/utils/product-image-gallery';

interface OptionValue {
  id: number;
  label: string;
}

@Component({
  selector: 'tcs-product-detail-page',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, ProductCardComponent],
  templateUrl: './product-detail-page.component.html',
  styleUrl: './product-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailPageComponent implements OnInit {
  readonly product = signal<ProductDetailDto | null>(null);
  readonly activeImage = signal<ProductDetailDto['images'][number] | null>(null);
  readonly imageFailed = signal(false);
  readonly zoomed = signal(false);
  readonly selectedColorId = signal<number | null>(null);
  readonly selectedSizeId = signal<number | null>(null);
  readonly selectedVolume = signal<number | null>(null);
  readonly quantity = signal(1);
  readonly loading = signal(true);
  readonly adding = signal(false);
  readonly error = signal('');
  readonly cartMessage = signal('');
  readonly cartError = signal('');
  readonly bagConfirmOpen = signal(false);
  readonly sizeChartOpen = signal(false);
  readonly returnsOpen = signal(false);
  readonly continueShoppingUrl = computed(() => {
    const product = this.product();
    const category = product?.categories?.[0];
    return category ? ['/category', category.categoryId, category.slug] : ['/'];
  });
  readonly related = signal<ProductCardDto[]>([]);
  readonly now = signal(Date.now());
  readonly selectedVariant = computed(() => this.matchingVariant());
  readonly saleInfo = computed(() => {
    const variant = this.selectedVariant();
    if (variant?.onSale) {
      return { name: variant.saleName ?? null, endsAt: variant.saleEndsAt ?? null };
    }
    const onSale = (this.product()?.variants ?? []).filter((item) => item.onSale && item.saleEndsAt);
    if (onSale.length === 0) {
      return null;
    }
    const soonest = onSale.reduce((a, b) =>
      new Date(a.saleEndsAt!).getTime() <= new Date(b.saleEndsAt!).getTime() ? a : b);
    return { name: soonest.saleName ?? null, endsAt: soonest.saleEndsAt ?? null };
  });
  readonly saleCountdown = computed(() => {
    const endsAt = this.saleInfo()?.endsAt;
    if (!endsAt) {
      return null;
    }
    const remaining = new Date(endsAt).getTime() - this.now();
    if (remaining <= 0) {
      return 'Ending soon';
    }
    const days = Math.floor(remaining / 86_400_000);
    const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    if (days > 0) {
      return `${days}d ${hours}h left`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${Math.max(minutes, 1)}m left`;
  });
  readonly visibleImages = computed(() =>
    imagesForColor(this.product()?.images ?? [], this.selectedColorId()));
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
    const countdown = window.setInterval(() => this.now.set(Date.now()), 60_000);
    this.destroyRef.onDestroy(() => window.clearInterval(countdown));
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
      this.imageFailed.set(false);
      this.selectedColorId.set(defaultColorIdForProduct(product?.images ?? [], product?.variants ?? []));
      this.selectedSizeId.set(null);
      this.selectedVolume.set(null);
      this.quantity.set(1);
      this.loading.set(false);
      if (product?.variants.length === 1) {
        this.selectVariant(product.variants[0]);
      }
      this.activeImage.set(this.visibleImages()[0] ?? null);
      this.zoomed.set(false);
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
    this.activeImage.set(this.visibleImages()[0] ?? null);
    this.imageFailed.set(false);
    this.zoomed.set(false);
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
        this.bagConfirmOpen.set(true);
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

  galleryCaption(altText: string | null): string | null {
    const view = altText?.match(/ - (Front|Back|Side) view/i)?.[1];
    if (!view) {
      return null;
    }
    return altText?.toLowerCase().includes('placeholder')
      ? `${view} - placeholder`
      : view;
  }

  toggleZoom(): void {
    this.zoomed.update((zoomed) => !zoomed);
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

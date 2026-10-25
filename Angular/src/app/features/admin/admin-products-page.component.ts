import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminProductCardDto, SaleWriteRequest } from '../../core/models/admin.models';
import { SaleDto } from '../../core/models/catalog.models';
import { PagedResult } from '../../core/models/api.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-products-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-products-page.component.html',
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProductsPageComponent implements OnInit {
  readonly result = signal<PagedResult<AdminProductCardDto> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly pageNumber = signal(1);
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly promoteTarget = signal<AdminProductCardDto | null>(null);
  readonly promotions = signal<SaleDto[]>([]);
  readonly promoting = signal(false);
  readonly promoteError = signal('');
  readonly promoteMessage = signal('');

  constructor(
    private readonly admin: AdminApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.load(1);
  }

  search(): void {
    this.load(1);
  }

  load(page: number): void {
    this.pageNumber.set(page);
    this.loading.set(true);
    this.error.set('');
    this.admin.getProducts(page, 20, this.searchControl.value.trim() || undefined).subscribe({
      next: (result) => {
        this.result.set(result);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Products could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  remove(product: AdminProductCardDto): void {
    if (!window.confirm(`Soft-delete “${product.name}”? Historical orders will remain unchanged.`)) {
      return;
    }
    this.error.set('');
    this.admin.deleteProduct(product.productId).subscribe({
      next: () => this.load(this.pageNumber()),
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'The product could not be deleted.').message),
    });
  }

  openPromote(product: AdminProductCardDto): void {
    this.promoteTarget.set(product);
    this.promoteError.set('');
    this.promoteMessage.set('');
    this.promotions.set([]);
    this.admin.getSales(1, 100).subscribe({
      next: (page) => this.promotions.set(page.items.filter((sale) => sale.isActive)),
      error: (failure: unknown) => this.promoteError.set(parseApiFailure(failure, 'Promotions could not be loaded.').message),
    });
  }

  closePromote(): void {
    if (!this.promoting()) {
      this.promoteTarget.set(null);
    }
  }

  attachToSale(sale: SaleDto): void {
    const product = this.promoteTarget();
    if (!product || this.promoting()) {
      return;
    }
    this.promoting.set(true);
    this.promoteError.set('');
    const productIds = [...new Set([...(sale.productIds ?? []), product.productId])];
    const request: SaleWriteRequest = {
      name: sale.name,
      discountType: sale.discountType === 'FixedAmount' ? 'FixedAmount' : 'Percentage',
      discountValue: sale.discountValue,
      startsAt: sale.startsAt,
      endsAt: sale.endsAt,
      productIds,
      categoryIds: sale.categoryIds ?? [],
      departmentIds: sale.departmentIds ?? [],
      applyToAll: sale.applyToAll ?? false,
    };
    this.admin.updateSale(sale.saleId, request).subscribe({
      next: () => {
        this.promoteMessage.set(`"${product.name}" added to "${sale.name}".`);
        this.promoting.set(false);
        this.promoteTarget.set(null);
      },
      error: (failure: unknown) => {
        this.promoteError.set(parseApiFailure(failure, 'The product could not be linked to that promotion.').message);
        this.promoting.set(false);
      },
    });
  }

  imageSource(path: string): string {
    return /^https?:\/\//i.test(path) || path.startsWith('/') ? path : `/${path}`;
  }
}

import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminProductCardDto } from '../../core/models/admin.models';
import { PagedResult } from '../../core/models/api.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-products-page',
  standalone: true,
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
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

  imageSource(path: string): string {
    return /^https?:\/\//i.test(path) || path.startsWith('/') ? path : `/${path}`;
  }
}

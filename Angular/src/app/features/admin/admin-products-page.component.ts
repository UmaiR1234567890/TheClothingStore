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
  template: `
    <section class="admin-page">
      <div class="admin-page-heading">
        <div><p class="eyebrow">Catalog</p><h1 class="page-title">Products.</h1></div>
        <a class="btn btn-primary" routerLink="/admin/products/new">Create product</a>
      </div>
      <div class="admin-toolbar">
        <form class="admin-toolbar__search" (ngSubmit)="search()">
          <input class="control" [formControl]="searchControl" type="search" placeholder="Search name, slug, or brand" aria-label="Search products">
          <button class="btn btn-outline btn-small" type="submit">Search</button>
        </form>
        <span class="muted-copy">{{ result()?.totalCount ?? 0 }} records</span>
      </div>
      @if (error()) { <div class="notice notice-error" role="alert">{{ error() }} <button class="text-button" type="button" (click)="load(pageNumber())">Retry</button></div> }
      @if (loading()) {
        <div class="state-panel"><span class="spinner" aria-label="Loading products"></span></div>
      } @else if (result()?.items?.length) {
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Product</th><th>Status</th><th>Variants</th><th>Price range</th><th>Actions</th></tr></thead>
            <tbody>
              @for (product of result()!.items; track product.productId) {
                <tr>
                  <td>
                    <div class="admin-product-cell">
                      @if (product.primaryImageUrl) {
                        <img class="admin-image-preview" [src]="imageSource(product.primaryImageUrl)" [alt]="product.name" loading="lazy">
                      } @else {
                        <span class="admin-image-preview admin-image-placeholder" aria-hidden="true">T</span>
                      }
                      <span><strong>{{ product.name }}</strong><small>{{ product.slug }}</small></span>
                    </div>
                  </td>
                  <td><span class="admin-badge" [class.admin-badge--inactive]="product.status !== 'Active' || product.isDeleted">{{ product.isDeleted ? 'Deleted' : product.status }}</span></td>
                  <td>{{ product.variantCount }}</td>
                  <td>
                    @if (product.minPrice !== null) {
                      {{ product.minPrice | currency:'PKR':'code':'1.0-2' }}
                      @if (product.maxPrice !== product.minPrice && product.maxPrice !== null) { – {{ product.maxPrice | currency:'PKR':'code':'1.0-2' }} }
                    } @else { <span class="muted-copy">No variants</span> }
                  </td>
                  <td>
                    <div class="admin-inline-actions">
                      <a [routerLink]="['/admin/products', product.productId, 'edit']">Edit</a>
                      <a [routerLink]="['/admin/products', product.productId, 'variants']">Variants</a>
                      <a [routerLink]="['/admin/products', product.productId, 'images']">Images</a>
                      @if (!product.isDeleted) {
                        <button type="button" (click)="remove(product)">Soft delete</button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (result()!.totalPages > 1) {
          <nav class="pagination" aria-label="Product pages">
            <button class="btn btn-outline btn-small" [disabled]="pageNumber() <= 1" (click)="load(pageNumber() - 1)" type="button">Previous</button>
            <span>Page {{ pageNumber() }} of {{ result()!.totalPages }}</span>
            <button class="btn btn-outline btn-small" [disabled]="pageNumber() >= result()!.totalPages" (click)="load(pageNumber() + 1)" type="button">Next</button>
          </nav>
        }
      } @else if (!error()) {
        <div class="state-panel"><h2>No products found</h2><p>Create a product or change the search.</p></div>
      }
    </section>
  `,
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

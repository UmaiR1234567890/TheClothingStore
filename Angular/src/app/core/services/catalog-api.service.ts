import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client.service';
import { PagedResult } from '../models/api.models';
import {
  CategoryDto,
  DepartmentDto,
  ProductCardDto,
  ProductDetailDto,
  ProductQuery,
  ProductVariantDto,
  SaleDto,
  VariantAvailabilityDto,
} from '../models/catalog.models';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  constructor(private readonly api: ApiClient) {}

  getDepartments(): Observable<DepartmentDto[]> {
    return this.api.get<DepartmentDto[]>('/departments');
  }

  getDepartmentCategories(slug: string): Observable<CategoryDto[]> {
    return this.api.get<CategoryDto[]>(`/departments/${encodeURIComponent(slug)}/categories`);
  }

  getCategories(departmentId?: number): Observable<CategoryDto[]> {
    return this.api.get<CategoryDto[]>('/categories', { departmentId });
  }

  getCategory(id: number): Observable<CategoryDto> {
    return this.api.get<CategoryDto>(`/categories/${id}`);
  }

  getCategoryBySlug(slug: string): Observable<CategoryDto> {
    return this.api.get<CategoryDto>(`/categories/slug/${encodeURIComponent(slug)}`);
  }

  getCategoryProducts(
    categoryId: number,
    pageNumber: number,
    pageSize: number,
  ): Observable<PagedResult<ProductCardDto>> {
    return this.api.get<PagedResult<ProductCardDto>>(`/categories/${categoryId}/products`, {
      pageNumber,
      pageSize,
    });
  }

  getProducts(query: ProductQuery): Observable<PagedResult<ProductCardDto>> {
    return this.api.get<PagedResult<ProductCardDto>>('/products', query);
  }

  search(query: ProductQuery): Observable<PagedResult<ProductCardDto>> {
    return this.api.get<PagedResult<ProductCardDto>>('/products/search', query);
  }

  getFeatured(pageNumber = 1, pageSize = 12): Observable<PagedResult<ProductCardDto>> {
    return this.api.get<PagedResult<ProductCardDto>>('/products/featured', { pageNumber, pageSize });
  }

  getNewArrivals(pageNumber = 1, pageSize = 12): Observable<PagedResult<ProductCardDto>> {
    return this.api.get<PagedResult<ProductCardDto>>('/products/new-arrivals', { pageNumber, pageSize });
  }

  getOnSale(pageNumber = 1, pageSize = 12): Observable<PagedResult<ProductCardDto>> {
    return this.api.get<PagedResult<ProductCardDto>>('/products/on-sale', { pageNumber, pageSize });
  }

  getProductBySlug(slug: string): Observable<ProductDetailDto> {
    return this.api.get<ProductDetailDto>(`/products/slug/${encodeURIComponent(slug)}`);
  }

  getVariants(productId: number): Observable<ProductVariantDto[]> {
    return this.api.get<ProductVariantDto[]>(`/products/${productId}/variants`);
  }

  getVariantAvailability(variantId: number): Observable<VariantAvailabilityDto> {
    return this.api.get<VariantAvailabilityDto>(`/variants/${variantId}/availability`);
  }

  getActiveSales(): Observable<SaleDto[]> {
    return this.api.get<SaleDto[]>('/sales/active');
  }
}

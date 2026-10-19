import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client.service';
import { PagedResult } from '../models/api.models';
import {
  AdminCustomerDto,
  AdminProductCardDto,
  CategoryWriteRequest,
  DashboardSummaryDto,
  DepartmentWriteRequest,
  InventoryAdjustmentRequest,
  InventoryDto,
  InventoryTransactionDto,
  PaymentStatusUpdateRequest,
  ProductAttributeDefinitionDto,
  ProductAttributeDefinitionWriteRequest,
  ProductImageWriteRequest,
  ProductWriteRequest,
  SaleWriteRequest,
  ShipmentWriteRequest,
  StatusUpdateRequest,
  VariantWriteRequest,
} from '../models/admin.models';
import {
  CategoryDto,
  DepartmentDto,
  ProductDetailDto,
  ProductImageDto,
  ProductVariantDto,
  SaleDto,
} from '../models/catalog.models';
import { OrderDto, PaymentDto, ShipmentDto } from '../models/commerce.models';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  constructor(private readonly api: ApiClient) {}

  getProducts(pageNumber = 1, pageSize = 20, search?: string): Observable<PagedResult<AdminProductCardDto>> {
    return this.api.get<PagedResult<AdminProductCardDto>>('/admin/products', { pageNumber, pageSize, search });
  }

  getProduct(id: number): Observable<ProductDetailDto> {
    return this.api.get<ProductDetailDto>(`/admin/products/${id}`);
  }

  createProduct(request: ProductWriteRequest): Observable<ProductDetailDto> {
    return this.api.post<ProductDetailDto>('/admin/products', request);
  }

  updateProduct(id: number, request: ProductWriteRequest): Observable<ProductDetailDto> {
    return this.api.put<ProductDetailDto>(`/admin/products/${id}`, request);
  }

  setProductStatus(id: number, status: StatusUpdateRequest['status']): Observable<object> {
    return this.api.patch<object>(`/admin/products/${id}/status`, { status });
  }

  deleteProduct(id: number): Observable<void> {
    return this.api.delete(`/admin/products/${id}`);
  }

  createVariant(productId: number, request: VariantWriteRequest): Observable<ProductVariantDto> {
    return this.api.post<ProductVariantDto>(`/admin/products/${productId}/variants`, request);
  }

  updateVariant(id: number, request: VariantWriteRequest): Observable<ProductVariantDto> {
    return this.api.put<ProductVariantDto>(`/admin/variants/${id}`, request);
  }

  setVariantStatus(id: number, status: string): Observable<object> {
    return this.api.patch<object>(`/admin/variants/${id}/status`, { status });
  }

  createImage(productId: number, request: ProductImageWriteRequest): Observable<ProductImageDto> {
    return this.api.post<ProductImageDto>(`/admin/products/${productId}/images`, request);
  }

  updateImage(id: number, request: ProductImageWriteRequest): Observable<ProductImageDto> {
    return this.api.put<ProductImageDto>(`/admin/images/${id}`, request);
  }

  deleteImage(id: number): Observable<void> {
    return this.api.delete(`/admin/images/${id}`);
  }

  setPrimaryImage(id: number): Observable<object> {
    return this.api.patch<object>(`/admin/images/${id}/primary`, null);
  }

  getDepartments(): Observable<DepartmentDto[]> {
    return this.api.get<DepartmentDto[]>('/admin/departments');
  }

  createDepartment(request: DepartmentWriteRequest): Observable<DepartmentDto> {
    return this.api.post<DepartmentDto>('/admin/departments', request);
  }

  updateDepartment(id: number, request: DepartmentWriteRequest): Observable<DepartmentDto> {
    return this.api.put<DepartmentDto>(`/admin/departments/${id}`, request);
  }

  setDepartmentStatus(id: number, status: string): Observable<object> {
    return this.api.patch<object>(`/admin/departments/${id}/status`, { status });
  }

  getCategories(departmentId?: number): Observable<CategoryDto[]> {
    return this.api.get<CategoryDto[]>('/admin/categories', { departmentId });
  }

  createCategory(request: CategoryWriteRequest): Observable<CategoryDto> {
    return this.api.post<CategoryDto>('/admin/categories', request);
  }

  updateCategory(id: number, request: CategoryWriteRequest): Observable<CategoryDto> {
    return this.api.put<CategoryDto>(`/admin/categories/${id}`, request);
  }

  setCategoryStatus(id: number, status: string): Observable<object> {
    return this.api.patch<object>(`/admin/categories/${id}/status`, { status });
  }

  deleteCategory(id: number): Observable<void> {
    return this.api.delete(`/admin/categories/${id}`);
  }

  getAttributes(): Observable<ProductAttributeDefinitionDto[]> {
    return this.api.get<ProductAttributeDefinitionDto[]>('/admin/attributes');
  }

  createAttribute(request: ProductAttributeDefinitionWriteRequest): Observable<ProductAttributeDefinitionDto> {
    return this.api.post<ProductAttributeDefinitionDto>('/admin/attributes', request);
  }

  updateAttribute(id: number, request: ProductAttributeDefinitionWriteRequest): Observable<ProductAttributeDefinitionDto> {
    return this.api.put<ProductAttributeDefinitionDto>(`/admin/attributes/${id}`, request);
  }

  setAttributeStatus(id: number, status: string): Observable<object> {
    return this.api.patch<object>(`/admin/attributes/${id}/status`, { status });
  }

  getSales(pageNumber = 1, pageSize = 20): Observable<PagedResult<SaleDto>> {
    return this.api.get<PagedResult<SaleDto>>('/admin/sales', { pageNumber, pageSize });
  }

  createSale(request: SaleWriteRequest): Observable<SaleDto> {
    return this.api.post<SaleDto>('/admin/sales', request);
  }

  updateSale(id: number, request: SaleWriteRequest): Observable<SaleDto> {
    return this.api.put<SaleDto>(`/admin/sales/${id}`, request);
  }

  setSaleStatus(id: number, status: string): Observable<object> {
    return this.api.patch<object>(`/admin/sales/${id}/status`, { status });
  }

  deleteSale(id: number): Observable<void> {
    return this.api.delete(`/admin/sales/${id}`);
  }

  getInventory(pageNumber = 1, pageSize = 20, search?: string): Observable<PagedResult<InventoryDto>> {
    return this.api.get<PagedResult<InventoryDto>>('/admin/inventory', { pageNumber, pageSize, search });
  }

  getInventoryForVariant(variantId: number): Observable<InventoryDto> {
    return this.api.get<InventoryDto>(`/admin/inventory/${variantId}`);
  }

  adjustInventory(request: InventoryAdjustmentRequest): Observable<InventoryDto> {
    return this.api.post<InventoryDto>('/admin/inventory/adjustments', request);
  }

  getInventoryTransactions(
    pageNumber = 1,
    pageSize = 20,
    variantId?: number,
  ): Observable<PagedResult<InventoryTransactionDto>> {
    return this.api.get<PagedResult<InventoryTransactionDto>>(
      '/admin/inventory/transactions',
      { pageNumber, pageSize, variantId },
    );
  }

  getOrders(pageNumber = 1, pageSize = 20, status?: string): Observable<PagedResult<OrderDto>> {
    return this.api.get<PagedResult<OrderDto>>('/admin/orders', { pageNumber, pageSize, status });
  }

  getOrder(id: number): Observable<OrderDto> {
    return this.api.get<OrderDto>(`/admin/orders/${id}`);
  }

  setOrderStatus(id: number, status: string): Observable<OrderDto> {
    return this.api.patch<OrderDto>(`/admin/orders/${id}/status`, { status });
  }

  getPayments(pageNumber = 1, pageSize = 20): Observable<PagedResult<PaymentDto>> {
    return this.api.get<PagedResult<PaymentDto>>('/admin/payments', { pageNumber, pageSize });
  }

  getPayment(id: number): Observable<PaymentDto> {
    return this.api.get<PaymentDto>(`/admin/payments/${id}`);
  }

  markCodCollected(id: number, request: PaymentStatusUpdateRequest): Observable<PaymentDto> {
    return this.api.post<PaymentDto>(`/payments/${id}/status`, request);
  }

  getShipments(pageNumber = 1, pageSize = 20): Observable<PagedResult<ShipmentDto>> {
    return this.api.get<PagedResult<ShipmentDto>>('/admin/shipments', { pageNumber, pageSize });
  }

  createShipment(request: ShipmentWriteRequest): Observable<ShipmentDto> {
    return this.api.post<ShipmentDto>('/admin/shipments', request);
  }

  updateShipment(id: number, request: ShipmentWriteRequest): Observable<ShipmentDto> {
    return this.api.put<ShipmentDto>(`/admin/shipments/${id}`, request);
  }

  setShipmentStatus(id: number, status: string): Observable<ShipmentDto> {
    return this.api.patch<ShipmentDto>(`/admin/shipments/${id}/status`, { status });
  }

  getCustomers(pageNumber = 1, pageSize = 20): Observable<PagedResult<AdminCustomerDto>> {
    return this.api.get<PagedResult<AdminCustomerDto>>('/admin/customers', { pageNumber, pageSize });
  }

  getCustomer(id: number): Observable<AdminCustomerDto> {
    return this.api.get<AdminCustomerDto>(`/admin/customers/${id}`);
  }

  setCustomerStatus(id: number, status: string): Observable<object> {
    return this.api.patch<object>(`/admin/customers/${id}/status`, { status });
  }

  getDashboardSummary(): Observable<DashboardSummaryDto> {
    return this.api.get<DashboardSummaryDto>('/admin/dashboard/summary');
  }
}

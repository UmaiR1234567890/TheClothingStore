import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client.service';
import { PagedResult } from '../models/api.models';
import { OrderDto, PaymentDto } from '../models/commerce.models';

@Injectable({ providedIn: 'root' })
export class OrderApiService {
  constructor(private readonly api: ApiClient) {}

  getOrders(pageNumber = 1, pageSize = 20, status?: string): Observable<PagedResult<OrderDto>> {
    return this.api.get<PagedResult<OrderDto>>('/orders', { pageNumber, pageSize, status });
  }

  getOrder(id: number): Observable<OrderDto> {
    return this.api.get<OrderDto>(`/orders/${id}`);
  }

  getTracking(id: number): Observable<OrderDto> {
    return this.api.get<OrderDto>(`/orders/${id}/tracking`);
  }

  getGuestTracking(orderNumber: string, email: string): Observable<OrderDto> {
    return this.api.get<OrderDto>('/orders/track', { orderNumber, email });
  }

  getPayment(orderId: number): Observable<PaymentDto> {
    return this.api.get<PaymentDto>(`/orders/${orderId}/payment`);
  }

  initiateCodPayment(orderId: number): Observable<PaymentDto> {
    return this.api.post<PaymentDto>(`/orders/${orderId}/payment/initiate`, { method: 'COD' });
  }
}

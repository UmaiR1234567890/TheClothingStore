import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client.service';
import { AddCartItemRequest, CartDto, UpdateCartItemRequest } from '../models/commerce.models';

@Injectable({ providedIn: 'root' })
export class CartApiService {
  constructor(private readonly api: ApiClient) {}

  getCart(): Observable<CartDto> {
    return this.api.get<CartDto>('/cart');
  }

  addItem(request: AddCartItemRequest): Observable<CartDto> {
    return this.api.post<CartDto>('/cart/items', request);
  }

  updateItem(cartItemId: number, request: UpdateCartItemRequest): Observable<CartDto> {
    return this.api.put<CartDto>(`/cart/items/${cartItemId}`, request);
  }

  removeItem(cartItemId: number): Observable<void> {
    return this.api.delete(`/cart/items/${cartItemId}`);
  }

  clear(): Observable<void> {
    return this.api.delete('/cart/items');
  }

  mergeGuestCart(): Observable<CartDto> {
    return this.api.post<CartDto>('/cart/merge', null);
  }
}

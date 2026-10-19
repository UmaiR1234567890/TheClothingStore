import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client.service';
import {
  AddressWriteRequest,
  CustomerAddressDto,
  CustomerProfileDto,
  CustomerProfileUpdateRequest,
} from '../models/commerce.models';

@Injectable({ providedIn: 'root' })
export class CustomerApiService {
  constructor(private readonly api: ApiClient) {}

  getProfile(): Observable<CustomerProfileDto> {
    return this.api.get<CustomerProfileDto>('/customers/me');
  }

  updateProfile(request: CustomerProfileUpdateRequest): Observable<CustomerProfileDto> {
    return this.api.put<CustomerProfileDto>('/customers/me', request);
  }

  getAddresses(): Observable<CustomerAddressDto[]> {
    return this.api.get<CustomerAddressDto[]>('/customers/me/addresses');
  }

  createAddress(request: AddressWriteRequest): Observable<CustomerAddressDto> {
    return this.api.post<CustomerAddressDto>('/customers/me/addresses', request);
  }

  updateAddress(id: number, request: AddressWriteRequest): Observable<CustomerAddressDto> {
    return this.api.put<CustomerAddressDto>(`/customers/me/addresses/${id}`, request);
  }

  deleteAddress(id: number): Observable<void> {
    return this.api.delete(`/customers/me/addresses/${id}`);
  }

  setDefaultAddress(id: number): Observable<{ addressId: number }> {
    return this.api.patch<{ addressId: number }>(`/customers/me/addresses/${id}/default`, null);
  }
}

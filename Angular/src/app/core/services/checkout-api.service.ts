import { HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client.service';
import { CheckoutRequest, CheckoutResultDto, CheckoutValidationDto } from '../models/commerce.models';

@Injectable({ providedIn: 'root' })
export class CheckoutApiService {
  constructor(private readonly api: ApiClient) {}

  validate(request: CheckoutRequest): Observable<CheckoutValidationDto> {
    return this.api.post<CheckoutValidationDto>('/checkout/validate', request);
  }

  placeOrder(request: CheckoutRequest): Observable<CheckoutResultDto> {
    const headers = new HttpHeaders({ 'Idempotency-Key': request.idempotencyKey });
    return this.api.post<CheckoutResultDto>('/checkout', request, headers);
  }
}

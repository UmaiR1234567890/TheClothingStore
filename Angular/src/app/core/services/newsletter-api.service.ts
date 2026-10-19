import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client.service';
import { NewsletterEmailRequest, NewsletterResultDto } from '../models/commerce.models';

@Injectable({ providedIn: 'root' })
export class NewsletterApiService {
  constructor(private readonly api: ApiClient) {}

  subscribe(request: NewsletterEmailRequest): Observable<NewsletterResultDto> {
    return this.api.post<NewsletterResultDto>('/newsletter/subscribe', request);
  }

  unsubscribe(request: NewsletterEmailRequest): Observable<NewsletterResultDto> {
    return this.api.post<NewsletterResultDto>('/newsletter/unsubscribe', request);
  }
}

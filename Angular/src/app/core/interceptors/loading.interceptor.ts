import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiBaseUrl)) {
    return next(request);
  }
  const loading = inject(LoadingService);
  loading.begin();
  return next(request).pipe(finalize(() => loading.end()));
};

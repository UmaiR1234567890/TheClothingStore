import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthTokenStore } from '../auth/auth-token.store';

export const apiAuthInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiBaseUrl)) {
    return next(request);
  }

  const tokenStore = inject(AuthTokenStore);
  const router = inject(Router);
  const token = tokenStore.token;
  const requiresBearer = isProtectedApiPath(request.url.slice(environment.apiBaseUrl.length));
  const authenticatedRequest = request.clone({
    withCredentials: true,
    ...(token && requiresBearer
      ? { setHeaders: { Authorization: `Bearer ${token}` } }
      : {}),
  });

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && token && requiresBearer) {
        tokenStore.clear();
        if (isProtectedFrontendRoute(router.url)) {
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
      }
      return throwError(() => error);
    }),
  );
};

function isProtectedApiPath(path: string): boolean {
  return path.startsWith('/auth/me') ||
    path.startsWith('/auth/logout') ||
    path.startsWith('/auth/change-password') ||
    path.startsWith('/customers/me') ||
    path.startsWith('/cart') ||
    path.startsWith('/checkout') ||
    path.startsWith('/orders') ||
    path.startsWith('/admin') ||
    path.startsWith('/payments/');
}

function isProtectedFrontendRoute(url: string): boolean {
  return url.startsWith('/account') ||
    url.startsWith('/checkout') ||
    url.startsWith('/admin');
}

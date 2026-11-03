import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { ApiClient } from '../services/api-client.service';
import {
  AuthTokenDto,
  AuthUserDto,
  ChangePasswordRequest,
  LoginRequest,
  PasswordEmailRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../models/commerce.models';
import { AuthTokenStore } from './auth-token.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSubject = new BehaviorSubject<AuthUserDto | null>(null);
  readonly user$ = this.userSubject.asObservable();

  constructor(
    private readonly api: ApiClient,
    private readonly tokenStore: AuthTokenStore,
  ) {
    this.tokenStore.token$.subscribe((token) => {
      if (token === null) {
        this.userSubject.next(null);
      }
    });
  }

  get userSnapshot(): AuthUserDto | null {
    return this.userSubject.value;
  }

  get hasAccessToken(): boolean {
    return this.tokenStore.token !== null;
  }

  restoreSession(): Observable<void> {
    if (!this.tokenStore.token) {
      return of(void 0);
    }
    return this.api.get<AuthUserDto>('/auth/me').pipe(
      tap((user) => this.userSubject.next(user)),
      map(() => void 0),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          this.clearLocalSession();
        }
        return of(void 0);
      }),
    );
  }

  loadCurrentUser(): Observable<AuthUserDto> {
    return this.api.get<AuthUserDto>('/auth/me').pipe(
      tap((user) => this.userSubject.next(user)),
    );
  }

  login(request: LoginRequest): Observable<AuthUserDto> {
    return this.api.post<AuthTokenDto>('/auth/login', request).pipe(
      map((result) => this.acceptToken(result)),
    );
  }

  register(request: RegisterRequest): Observable<AuthUserDto> {
    return this.api.post<AuthTokenDto>('/auth/register', request).pipe(
      map((result) => this.acceptToken(result)),
    );
  }

  private refreshInFlight$: Observable<AuthTokenDto | null> | null = null;

  refreshAccess(): Observable<AuthTokenDto | null> {
    const refreshToken = this.tokenStore.refreshToken;
    if (!refreshToken) {
      return of(null);
    }
    this.refreshInFlight$ ??= this.api.post<AuthTokenDto>('/auth/refresh', { refreshToken }).pipe(
      map((result) => this.acceptToken(result) && result),
      catchError(() => {
        this.clearLocalSession();
        return of(null);
      }),
      finalize(() => { this.refreshInFlight$ = null; }),
    );
    return this.refreshInFlight$;
  }

  logout(): Observable<void> {
    const refreshToken = this.tokenStore.refreshToken;
    if (!refreshToken) {
      this.clearLocalSession();
      return of(void 0);
    }
    return this.api.post<object>('/auth/logout', { refreshToken }).pipe(
      map(() => void 0),
      catchError(() => of(void 0)),
      finalize(() => this.clearLocalSession()),
    );
  }

  changePassword(request: ChangePasswordRequest): Observable<object> {
    return this.api.post<object>('/auth/change-password', request);
  }

  requestPasswordReset(request: PasswordEmailRequest): Observable<object> {
    return this.api.post<object>('/auth/forgot-password', request);
  }

  resetPassword(request: ResetPasswordRequest): Observable<object> {
    return this.api.post<object>('/auth/reset-password', request);
  }

  hasRole(role: string): boolean {
    return this.userSubject.value?.roles.includes(role) ?? false;
  }

  clearLocalSession(): void {
    this.tokenStore.clear();
    this.userSubject.next(null);
  }

  private acceptToken(result: AuthTokenDto): AuthUserDto {
    this.tokenStore.setPair(result.accessToken, result.refreshToken);
    this.userSubject.next(result.user);
    return result.user;
  }
}

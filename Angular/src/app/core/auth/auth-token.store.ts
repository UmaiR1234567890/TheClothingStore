import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const TOKEN_STORAGE_KEY = 'tcs.access-token';
const REFRESH_STORAGE_KEY = 'tcs.refresh-token';

@Injectable({ providedIn: 'root' })
export class AuthTokenStore {
  private readonly tokenSubject = new BehaviorSubject<string | null>(this.readStoredToken());
  readonly token$ = this.tokenSubject.asObservable();

  get token(): string | null {
    return this.tokenSubject.value;
  }

  get refreshToken(): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(REFRESH_STORAGE_KEY);
  }

  set(token: string): void {
    this.tokenSubject.next(token);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  }

  setPair(accessToken: string, refreshToken: string): void {
    this.set(accessToken);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(REFRESH_STORAGE_KEY, refreshToken);
    }
  }

  clear(): void {
    this.tokenSubject.next(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(REFRESH_STORAGE_KEY);
    }
  }

  private readStoredToken(): string | null {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(TOKEN_STORAGE_KEY);
  }
}

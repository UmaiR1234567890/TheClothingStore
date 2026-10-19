import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const TOKEN_STORAGE_KEY = 'tcs.access-token';

@Injectable({ providedIn: 'root' })
export class AuthTokenStore {
  private readonly tokenSubject = new BehaviorSubject<string | null>(this.readStoredToken());
  readonly token$ = this.tokenSubject.asObservable();

  get token(): string | null {
    return this.tokenSubject.value;
  }

  set(token: string): void {
    this.tokenSubject.next(token);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  }

  clear(): void {
    this.tokenSubject.next(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  private readStoredToken(): string | null {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(TOKEN_STORAGE_KEY);
  }
}

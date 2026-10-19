import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AuthTokenStore } from '../auth/auth-token.store';
import { AuthUserDto } from '../models/commerce.models';
import { adminGuard, authGuard, guestOnlyGuard } from './auth.guards';

describe('authentication route guards', () => {
  let authStub: {
    userSnapshot: AuthUserDto | null;
    loadCurrentUser: jasmine.Spy;
    clearLocalSession: jasmine.Spy;
  };

  beforeEach(() => {
    authStub = {
      userSnapshot: null,
      loadCurrentUser: jasmine.createSpy('loadCurrentUser').and.returnValue(of(null)),
      clearLocalSession: jasmine.createSpy('clearLocalSession'),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
      ],
    });
    TestBed.inject(AuthTokenStore).clear();
  });

  it('redirects unauthenticated users to sign-in with the requested path', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/account/orders' } as RouterStateSnapshot),
    );

    expect(result instanceof UrlTree).toBeTrue();
    if (result instanceof UrlTree) {
      const router = TestBed.inject(Router);
      expect(router.serializeUrl(result)).toContain('/login');
      expect(result.queryParams['returnUrl']).toBe('/account/orders');
    }
  });

  it('keeps guests on guest-only pages when there is no token', () => {
    const result = TestBed.runInInjectionContext(() =>
      guestOnlyGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    expect(result).toBeTrue();
  });

  it('does not permit admin access without an access token', () => {
    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url: '/admin' } as RouterStateSnapshot),
    );

    expect(result instanceof UrlTree).toBeTrue();
    if (result instanceof UrlTree) {
      expect(result.queryParams['returnUrl']).toBe('/admin');
    }
  });

  it('rejects a signed-in customer whose backend user has no Admin role', () => {
    authStub.userSnapshot = { userId: 'u-1', email: 'customer@example.test', customerId: 1, roles: ['Customer'] };
    TestBed.inject(AuthTokenStore).set('test-access-token');

    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url: '/admin' } as RouterStateSnapshot),
    );

    let guardResult: boolean | UrlTree | undefined;
    (result as Observable<boolean | UrlTree>).subscribe((value) => guardResult = value);
    expect(guardResult instanceof UrlTree).toBeTrue();
    if (guardResult instanceof UrlTree) {
      expect(TestBed.inject(Router).serializeUrl(guardResult)).toBe('/unauthorized');
    }
  });

  it('allows an admin role returned by the API', () => {
    authStub.userSnapshot = { userId: 'u-admin', email: 'admin@example.test', customerId: null, roles: ['Admin'] };
    TestBed.inject(AuthTokenStore).set('test-access-token');

    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url: '/admin' } as RouterStateSnapshot),
    );
    let guardResult: boolean | UrlTree | undefined;
    (result as Observable<boolean | UrlTree>).subscribe((value) => guardResult = value);

    expect(guardResult).toBeTrue();
  });
});

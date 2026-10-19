import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { AuthTokenStore } from './auth-token.store';
import { AuthTokenDto } from '../models/commerce.models';

describe('AuthService', () => {
  let service: AuthService;
  let tokens: AuthTokenStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    tokens = TestBed.inject(AuthTokenStore);
    http = TestBed.inject(HttpTestingController);
    tokens.clear();
  });

  afterEach(() => {
    tokens.clear();
    http.verify();
  });

  it('stores only the returned bearer token and backend-issued user on login', () => {
    let signedInEmail = '';
    service.login({ email: 'shopper@example.test', password: 'Never logged' }).subscribe((user) => {
      signedInEmail = user.email;
    });

    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'shopper@example.test', password: 'Never logged' });
    const response: AuthTokenDto = {
      accessToken: 'server-issued-token',
      tokenType: 'Bearer',
      expiresInSeconds: 900,
      user: { userId: 'user-1', email: 'shopper@example.test', customerId: 12, roles: ['Customer'] },
    };
    request.flush({ success: true, message: 'Signed in', data: response });

    expect(tokens.token).toBe('server-issued-token');
    expect(signedInEmail).toBe('shopper@example.test');
    expect(service.hasRole('Admin')).toBeFalse();
  });

  it('clears the browser session after logout even if the server call fails', () => {
    tokens.set('server-issued-token');
    let completed = false;
    service.logout().subscribe(() => completed = true);

    const request = http.expectOne('/api/v1/auth/logout');
    expect(request.request.method).toBe('POST');
    request.flush({ message: 'Unavailable' }, { status: 503, statusText: 'Service Unavailable' });

    expect(completed).toBeTrue();
    expect(tokens.token).toBeNull();
  });
});

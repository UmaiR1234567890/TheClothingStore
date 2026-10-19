import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiAuthInterceptor } from './api-auth.interceptor';
import { AuthTokenStore } from '../auth/auth-token.store';

describe('apiAuthInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let tokens: AuthTokenStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiAuthInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    tokens = TestBed.inject(AuthTokenStore);
    tokens.clear();
  });

  afterEach(() => {
    tokens.clear();
    http.verify();
  });

  it('sends guest credentials without adding a bearer token to public catalog calls', () => {
    tokens.set('test-access-token');
    client.get('/api/v1/products').subscribe();

    const request = http.expectOne('/api/v1/products');
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({ success: true, message: 'Success', data: null });
  });

  it('attaches the bearer token to protected endpoints only', () => {
    tokens.set('test-access-token');
    client.get('/api/v1/auth/me').subscribe();

    const request = http.expectOne('/api/v1/auth/me');
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-access-token');
    request.flush({ success: true, message: 'Success', data: null });
  });

  it('does not attach API credentials to unrelated external requests', () => {
    tokens.set('test-access-token');
    client.get('https://images.example.test/asset.jpg').subscribe();

    const request = http.expectOne('https://images.example.test/asset.jpg');
    expect(request.request.withCredentials).toBeFalse();
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({ ok: true });
  });
});

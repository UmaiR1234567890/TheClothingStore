import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CartStateService } from './cart-state.service';

describe('CartStateService', () => {
  let service: CartStateService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CartStateService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CartStateService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the server cart quantity and does not invent a count on failure', () => {
    const counts: Array<number | null> = [];
    service.count$.subscribe((count) => counts.push(count));
    service.refresh();
    http.expectOne('/api/v1/cart').flush({
      success: true,
      message: 'Success',
      data: { cartId: 1, items: [], subtotal: 0, totalQuantity: 3 },
    });
    expect(counts).toEqual([null, 3]);

    service.refresh();
    http.expectOne('/api/v1/cart').flush(
      { success: false, message: 'Unavailable', data: null },
      { status: 503, statusText: 'Service Unavailable' },
    );
    expect(counts).toEqual([null, 3, null]);
  });
});

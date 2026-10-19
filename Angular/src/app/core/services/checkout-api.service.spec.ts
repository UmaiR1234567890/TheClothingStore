import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CheckoutApiService } from './checkout-api.service';
import { CheckoutRequest, CheckoutResultDto } from '../models/commerce.models';

describe('CheckoutApiService', () => {
  let service: CheckoutApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CheckoutApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CheckoutApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends COD and the same idempotency key in the body and header', () => {
    const request: CheckoutRequest = {
      guestEmail: 'guest@example.test',
      shippingAddressId: null,
      guestShippingAddress: {
        fullName: 'Test Guest',
        line1: '10 Test Street',
        city: 'Test City',
        region: null,
        postalCode: null,
        country: 'Pakistan',
      },
      paymentMethod: 'COD',
      idempotencyKey: 'f58d0892-86fb-4c12-a316-55b53e75ed44',
    };
    const received: CheckoutResultDto[] = [];
    service.placeOrder(request).subscribe((result) => received.push(result));

    const apiRequest = http.expectOne('/api/v1/checkout');
    expect(apiRequest.request.method).toBe('POST');
    expect(apiRequest.request.headers.get('Idempotency-Key')).toBe(request.idempotencyKey);
    expect(apiRequest.request.body.paymentMethod).toBe('COD');
    expect(apiRequest.request.body.idempotencyKey).toBe(request.idempotencyKey);
    apiRequest.flush({
      success: true,
      message: 'Order created',
      data: {
        order: {
          orderId: 9,
          orderNumber: 'TCS-TEST',
          status: 'Pending',
          subtotalAmount: 1000,
          discountAmount: 0,
          shippingAmount: 0,
          taxAmount: 0,
          totalAmount: 1000,
          placedAt: '2025-01-01T00:00:00Z',
          guestEmail: 'guest@example.test',
          shippingName: 'Test Guest',
          shippingLine1: '10 Test Street',
          shippingCity: 'Test City',
          shippingRegion: null,
          shippingPostalCode: null,
          shippingCountry: 'Pakistan',
          items: [],
          payments: [],
          shipments: [],
        },
        paymentStatus: 'Pending',
        message: 'Order created',
        wasAlreadyProcessed: false,
      },
    });

    expect(received[0].order.orderNumber).toBe('TCS-TEST');
    expect(received[0].paymentStatus).toBe('Pending');
  });
});

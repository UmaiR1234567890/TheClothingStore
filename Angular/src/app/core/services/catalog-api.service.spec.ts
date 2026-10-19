import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CatalogApiService } from './catalog-api.service';

describe('CatalogApiService', () => {
  let service: CatalogApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CatalogApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CatalogApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the server-side product filters and unwraps the API response', () => {
    let names: string[] = [];
    service.getProducts({
      Department: 'men',
      Search: 'cotton shirt',
      MinPrice: 1000,
      MaxPrice: 5000,
      OnSale: true,
      SortBy: 'price-asc',
      PageNumber: 2,
      PageSize: 12,
    }).subscribe((result) => {
      names = result.items.map((item) => item.name);
    });

    const request = http.expectOne((req) => req.url === '/api/v1/products');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('Department')).toBe('men');
    expect(request.request.params.get('Search')).toBe('cotton shirt');
    expect(request.request.params.get('MinPrice')).toBe('1000');
    expect(request.request.params.get('MaxPrice')).toBe('5000');
    expect(request.request.params.get('OnSale')).toBe('true');
    expect(request.request.params.get('PageNumber')).toBe('2');
    expect(request.request.params.get('PageSize')).toBe('12');
    request.flush({
      success: true,
      message: 'Success',
      data: {
        items: [{ productId: 1, name: 'Cotton shirt' }],
        pageNumber: 2,
        pageSize: 12,
        totalCount: 13,
        totalPages: 2,
      },
    });

    expect(names).toEqual(['Cotton shirt']);
  });
});

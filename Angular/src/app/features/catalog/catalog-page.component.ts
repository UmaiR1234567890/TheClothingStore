import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink, convertToParamMap } from '@angular/router';
import { Observable, Subscription, catchError, combineLatest, map, of, switchMap } from 'rxjs';
import { PagedResult } from '../../core/models/api.models';
import { CategoryDto, DepartmentDto, ProductCardDto, ProductQuery } from '../../core/models/catalog.models';
import { parseApiFailure } from '../../core/services/api-error.service';
import { CatalogApiService } from '../../core/services/catalog-api.service';
import { PageTitleService } from '../../core/services/page-title.service';
import { ProductCardComponent } from '../../shared/components/product-card.component';

interface CatalogContext {
  searchMode: boolean;
  categoryMode: boolean;
  departmentSlug: string | null;
  categoryId: number | null;
}

interface ResolvedCategoryContext {
  category: CategoryDto | null;
  departmentSlug: string | null;
}

type SelectChoice = 'any' | 'true' | 'false';

@Component({
  selector: 'tcs-catalog-page',
  standalone: true,
  imports: [AsyncPipe, ReactiveFormsModule, RouterLink, ProductCardComponent],
  templateUrl: './catalog-page.component.html',
  styleUrl: './catalog-page.component.scss',
})
export class CatalogPageComponent implements OnInit {
  readonly title = signal('The collection');
  readonly departmentName = signal<string | null>(null);
  readonly departmentCategories = signal<CategoryDto[]>([]);
  readonly category = signal<CategoryDto | null>(null);
  readonly page = signal<PagedResult<ProductCardDto> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly searchMode = signal(false);
  readonly categoryMode = signal(false);
  readonly currentSearch = signal('');
  readonly sortBy = signal<ProductQuery['SortBy']>('newest');
  readonly pageNumber = signal(1);
  readonly filtersOpen = signal(false);
  readonly openGroups = signal(new Set(['price', 'category']));
  readonly selectedCategorySlug = signal<string | null>(null);
  readonly priceBounds = { min: 0, max: 50000 };
  readonly skeletons = [1, 2, 3, 4, 5, 6, 7, 8];
  readonly filterForm = new FormGroup({
    minPrice: new FormControl('', { nonNullable: true }),
    maxPrice: new FormControl('', { nonNullable: true }),
    onSale: new FormControl<SelectChoice>('any', { nonNullable: true }),
    available: new FormControl<SelectChoice>('any', { nonNullable: true }),
    volumeMl: new FormControl('', { nonNullable: true }),
    attribute: new FormControl('', { nonNullable: true }),
  });

  private currentContext: CatalogContext = {
    searchMode: false,
    categoryMode: false,
    departmentSlug: null,
    categoryId: null,
  };
  private currentQueryMap: ParamMap = convertToParamMap({});
  private categoryCache = new Map<number, CategoryDto>();
  private departmentSlugCache = new Map<number, string>();
  private loadedCategoryDepartment: string | null = null;
  private categoryRequest: Subscription | null = null;
  private resultsRequest: Subscription | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly catalog: CatalogApiService,
    private readonly pageTitles: PageTitleService,
  ) {
    this.destroyRef.onDestroy(() => {
      this.categoryRequest?.unsubscribe();
      this.resultsRequest?.unsubscribe();
    });
  }

  ngOnInit(): void {
    combineLatest([this.route.data, this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([data, params, query]) => {
        const slug = data['departmentSlug'];
        this.currentContext = {
          searchMode: data['searchMode'] === true,
          categoryMode: data['categoryMode'] === true,
          departmentSlug: typeof slug === 'string' ? slug : null,
          categoryId: parsePositiveInteger(params.get('categoryId')),
        };
        this.currentQueryMap = query;
        this.syncFilterForm(query);
        this.loadResults();
      });
  }

  applyFilters(): void {
    const form = this.filterForm.getRawValue();
    const queryParams: Record<string, string | number | boolean | null | undefined> = {
      ...this.route.snapshot.queryParams,
      PageNumber: 1,
      SortBy: this.sortBy(),
      MinPrice: parseOptionalNumber(form.minPrice),
      MaxPrice: parseOptionalNumber(form.maxPrice),
      OnSale: parseChoice(form.onSale),
      Available: parseChoice(form.available),
      VolumeMl: parseOptionalNumber(form.volumeMl),
      Attribute: form.attribute.trim() || null,
      Category: this.selectedCategorySlug(),
    };
    this.filtersOpen.set(false);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  clearFilters(): void {
    this.filterForm.reset({
      minPrice: '',
      maxPrice: '',
      onSale: 'any',
      available: 'any',
      volumeMl: '',
      attribute: '',
    });
    this.filtersOpen.set(false);
    const queryParams: Record<string, null> = {
      MinPrice: null,
      MaxPrice: null,
      OnSale: null,
      Available: null,
      VolumeMl: null,
      Attribute: null,
      Category: null,
      PageNumber: null,
    };
    this.selectedCategorySlug.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  changeSort(value: string): void {
    if (!isSortOption(value)) {
      return;
    }
    this.sortBy.set(value);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { SortBy: value, PageNumber: 1 },
      queryParamsHandling: 'merge',
    });
  }

  onSortEvent(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.changeSort(target.value);
    }
  }

  changePage(pageNumber: number): void {
    if (pageNumber < 1) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { PageNumber: pageNumber },
      queryParamsHandling: 'merge',
    });
  }

  toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  isGroupOpen(name: string): boolean {
    return this.openGroups().has(name);
  }

  toggleGroup(name: string): void {
    const next = new Set(this.openGroups());
    next.has(name) ? next.delete(name) : next.add(name);
    this.openGroups.set(next);
  }

  toggleCategoryFilter(category: CategoryDto): void {
    this.selectedCategorySlug.update((current) => current === category.slug ? null : category.slug);
  }

  minPriceRangeValue(): number {
    return Number(this.filterForm.controls.minPrice.value) || this.priceBounds.min;
  }

  maxPriceRangeValue(): number {
    return Number(this.filterForm.controls.maxPrice.value) || this.priceBounds.max;
  }

  minPricePct(): number {
    return Math.min(100, (this.minPriceRangeValue() / this.priceBounds.max) * 100);
  }

  maxPricePct(): number {
    return Math.min(100, (this.maxPriceRangeValue() / this.priceBounds.max) * 100);
  }

  onPriceRange(which: 'min' | 'max', event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    if (which === 'min') {
      this.filterForm.controls.minPrice.setValue(String(Math.min(value, this.maxPriceRangeValue())));
    } else {
      this.filterForm.controls.maxPrice.setValue(String(Math.max(value, this.minPriceRangeValue())));
    }
  }

  reload(): void {
    this.loadResults();
  }

  private loadResults(): void {
    this.resultsRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.currentSearch.set(this.currentQueryMap.get('Search') ?? '');
    const query = this.readQuery(this.currentQueryMap, this.currentContext);
    this.pageNumber.set(query.PageNumber ?? 1);
    this.sortBy.set(query.SortBy ?? 'newest');
    this.searchMode.set(this.currentContext.searchMode);
    this.categoryMode.set(this.currentContext.categoryMode);
    if (this.currentContext.searchMode) {
      this.updateTitle('Search results');
    }
    this.loadDepartmentCategories(this.currentContext.departmentSlug);

    if (this.currentContext.searchMode && !query.Search?.trim()) {
      this.page.set(emptyPage(query.PageNumber ?? 1, query.PageSize ?? 20));
      this.loading.set(false);
      return;
    }

    const result$ = this.currentContext.categoryMode && this.currentContext.categoryId !== null
      ? this.loadCategoryProducts(this.currentContext.categoryId, query)
      : this.currentContext.searchMode
        ? this.catalog.search(query)
        : this.catalog.getProducts(query);

    this.resultsRequest = result$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.page.set(result);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'The collection could not be loaded.').message);
        this.page.set(null);
        this.loading.set(false);
      },
    });
  }

  private loadCategoryProducts(
    categoryId: number,
    query: ProductQuery,
  ): Observable<PagedResult<ProductCardDto>> {
    const category$ = this.categoryCache.has(categoryId)
      ? of(this.categoryCache.get(categoryId)!)
      : this.catalog.getCategory(categoryId).pipe(
          map((category) => {
            this.categoryCache.set(category.categoryId, category);
            return category;
          }),
        );

    return category$.pipe(
      switchMap((category) => {
        this.category.set(category);
        this.updateTitle(category.name);
        const departmentSlug = this.departmentSlugCache.get(category.departmentId);
        if (departmentSlug) {
          return this.catalog.getProducts({
            ...query,
            Department: departmentSlug,
            Category: category.slug,
          });
        }
        return this.catalog.getDepartments().pipe(
          switchMap((departments) => {
            const department = departments.find((item) => item.departmentId === category.departmentId);
            if (!department) {
              throw new Error('The category department is unavailable.');
            }
            this.departmentSlugCache.set(category.departmentId, department.slug);
            return this.catalog.getProducts({
              ...query,
              Department: department.slug,
              Category: category.slug,
            });
          }),
        );
      }),
    );
  }

  private loadDepartmentCategories(departmentSlug: string | null): void {
    this.category.set(null);
    if (!departmentSlug) {
      this.categoryRequest?.unsubscribe();
      this.categoryRequest = null;
      this.loadedCategoryDepartment = null;
      this.departmentCategories.set([]);
      this.departmentName.set(null);
      if (!this.currentContext.categoryMode && !this.currentContext.searchMode) {
        this.updateTitle('The collection');
      }
      return;
    }
    if (this.loadedCategoryDepartment === departmentSlug) {
      return;
    }
    this.categoryRequest?.unsubscribe();
    this.loadedCategoryDepartment = departmentSlug;
    const knownDepartment = departmentSlug.charAt(0).toUpperCase() + departmentSlug.slice(1);
    this.departmentName.set(knownDepartment);
    this.updateTitle(knownDepartment);
    this.categoryRequest = this.catalog.getDepartmentCategories(departmentSlug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => this.departmentCategories.set(categories),
        error: () => {
          this.loadedCategoryDepartment = null;
          this.departmentCategories.set([]);
        },
      });
  }

  private syncFilterForm(query: ParamMap): void {
    this.selectedCategorySlug.set(query.get('Category'));
    this.filterForm.patchValue({
      minPrice: query.get('MinPrice') ?? '',
      maxPrice: query.get('MaxPrice') ?? '',
      onSale: parseChoiceLabel(query.get('OnSale')),
      available: parseChoiceLabel(query.get('Available')),
      volumeMl: query.get('VolumeMl') ?? '',
      attribute: query.get('Attribute') ?? '',
    }, { emitEvent: false });
  }

  private updateTitle(title: string): void {
    this.title.set(title);
    this.pageTitles.set(
      title,
      `Explore ${title.toLowerCase()} at The Clothing Store. Prices, availability, and product details are confirmed by the store.`,
    );
  }

  private readQuery(query: ParamMap, context: CatalogContext): ProductQuery {
    const department = context.departmentSlug ?? query.get('Department') ?? undefined;
    const attribute = query.get('Attribute') ?? undefined;
    const sort = query.get('SortBy');
    return {
      Department: department,
      Category: context.categoryMode ? undefined : query.get('Category') ?? undefined,
      Search: query.get('Search') ?? undefined,
      MinPrice: parseOptionalNumber(query.get('MinPrice')),
      MaxPrice: parseOptionalNumber(query.get('MaxPrice')),
      VolumeMl: parseOptionalNumber(query.get('VolumeMl')),
      Attribute: attribute,
      OnSale: parseChoice(query.get('OnSale')),
      Available: parseChoice(query.get('Available')),
      SortBy: isSortOption(sort) ? sort : 'newest',
      PageNumber: parseOptionalNumber(query.get('PageNumber')) ?? 1,
      PageSize: Math.min(parseOptionalNumber(query.get('PageSize')) ?? 12, 100),
    };
  }
}

function parsePositiveInteger(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseOptionalNumber(value: string | number | null): number | undefined {
  if (value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseChoice(value: string | null): boolean | undefined {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
}

function parseChoiceLabel(value: string | null): SelectChoice {
  return value === 'true' || value === 'false' ? value : 'any';
}

function isSortOption(value: string | null): value is NonNullable<ProductQuery['SortBy']> {
  return value === 'newest' ||
    value === 'name' ||
    value === 'price-asc' ||
    value === 'price-desc' ||
    value === 'popular';
}

function emptyPage(pageNumber: number, pageSize: number): PagedResult<ProductCardDto> {
  return { items: [], pageNumber, pageSize, totalCount: 0, totalPages: 0 };
}

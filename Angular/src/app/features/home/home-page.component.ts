import { AsyncPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogApiService } from '../../core/services/catalog-api.service';
import { CategoryDto, DepartmentDto, ProductCardDto } from '../../core/models/catalog.models';
import { ProductCardComponent } from '../../shared/components/product-card.component';

@Component({
  selector: 'tcs-home-page',
  standalone: true,
  imports: [ProductCardComponent, RouterLink],
  template: `
    <section class="hero">
      <div class="hero__art" aria-hidden="true">
        <div class="hero__orb"></div>
        <div class="hero__line hero__line--one"></div>
        <div class="hero__line hero__line--two"></div>
        <div class="hero__monogram">T</div>
      </div>
      <div class="hero__content">
        <p class="eyebrow">The new season, considered</p>
        <h1>Dress for<br><em>your own</em><br>direction.</h1>
        <p class="hero__lede">Pieces with a point of view. Made for everyday rituals, long afternoons, and the moments in between.</p>
        <div class="hero__actions">
          <a class="btn btn-accent" routerLink="/men">Explore the collection <span aria-hidden="true">→</span></a>
          <a class="hero__secondary" routerLink="/women">Discover women</a>
        </div>
        <span class="hero__edition">COLLECTION 01 <span>—</span> 2026</span>
      </div>
      <div class="hero__caption">
        <span>01 / 03</span>
        <span>Quiet form. Strong feeling.</span>
      </div>
    </section>

    <section class="department-section container">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Made for all the ways you are</p>
          <h2 class="section-title">Find your edit.</h2>
        </div>
        <p class="section-note">Three worlds, one point of view.</p>
      </div>
      @if (departmentError()) {
        <div class="notice notice-error" role="alert">
          {{ departmentError() }}
          <button class="text-button" type="button" (click)="loadDepartments()">Try again</button>
        </div>
      } @else if (departmentsLoading()) {
        <div class="department-grid department-grid--loading" aria-label="Loading departments">
          <div class="department-skeleton"></div>
          <div class="department-skeleton"></div>
          <div class="department-skeleton"></div>
        </div>
      } @else {
        <div class="department-grid">
          @for (department of departments(); track department.departmentId; let index = $index) {
            <a class="department-tile" [class]="'department-tile department-tile--' + (index + 1)" [routerLink]="['/', department.slug]">
              <span class="department-tile__index">0{{ index + 1 }}</span>
              <span class="department-tile__name">{{ department.name }}</span>
              <span class="department-tile__link">Explore <span aria-hidden="true">↗</span></span>
            </a>
          } @empty {
            <div class="state-panel"><p>Departments are not available right now.</p></div>
          }
        </div>
      }
    </section>

    <section class="collection-section container">
      <div class="section-heading">
        <div>
          <p class="eyebrow">From the latest collection</p>
          <h2 class="section-title">New in.</h2>
        </div>
        <a class="text-link" routerLink="/men">View all <span aria-hidden="true">→</span></a>
      </div>
      @if (newArrivalsError()) {
        <div class="notice notice-error" role="alert">{{ newArrivalsError() }} <button class="text-button" type="button" (click)="loadNewArrivals()">Try again</button></div>
      } @else if (newArrivalsLoading()) {
        <div class="product-grid">
          @for (item of skeletons; track item) { <div class="product-skeleton"></div> }
        </div>
      } @else if (newArrivals().length > 0) {
        <div class="product-grid">
          @for (product of newArrivals(); track product.productId) {
            <tcs-product-card [product]="product" />
          }
        </div>
      } @else {
        <div class="state-panel"><h2>No new arrivals yet</h2><p>Check back soon for the next collection.</p></div>
      }
    </section>

    <section class="statement-band">
      <div class="statement-band__inner container">
        <span class="statement-band__mark" aria-hidden="true">TCS</span>
        <p class="eyebrow">Clothing with intention</p>
        <h2>Not more.<br><em>More meaning.</em></h2>
        <p>We believe in reaching for the pieces that feel like you, season after season.</p>
        <a class="text-link text-link--light" routerLink="/about">Our point of view <span aria-hidden="true">→</span></a>
      </div>
    </section>

    <section class="collection-section container">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Selected by you</p>
          <h2 class="section-title">Most ordered.</h2>
        </div>
        <p class="section-note">A best-seller edit from recent orders.</p>
      </div>
      @if (featuredError()) {
        <div class="notice notice-error" role="alert">{{ featuredError() }} <button class="text-button" type="button" (click)="loadFeatured()">Try again</button></div>
      } @else if (featuredLoading()) {
        <div class="product-grid">
          @for (item of skeletons; track item) { <div class="product-skeleton"></div> }
        </div>
      } @else if (featured().length > 0) {
        <div class="product-grid">
          @for (product of featured(); track product.productId) {
            <tcs-product-card [product]="product" />
          }
        </div>
      } @else {
        <div class="state-panel"><h2>Nothing to show just yet</h2><p>Explore the collection and find something for your everyday.</p></div>
      }
    </section>

    <section class="sale-section container">
      <div class="sale-section__intro">
        <p class="eyebrow">A considered find</p>
        <h2 class="section-title">On sale.</h2>
        <p>Current offers from the collection. Prices are supplied by the store and confirmed again at checkout.</p>
        <a class="btn btn-outline" routerLink="/men">Shop current offers</a>
      </div>
      <div class="sale-section__products">
        @if (saleError()) {
          <div class="notice notice-error" role="alert">{{ saleError() }} <button class="text-button" type="button" (click)="loadSaleProducts()">Try again</button></div>
        } @else if (saleLoading()) {
          <div class="product-skeleton product-skeleton--wide"></div>
        } @else if (saleProducts().length > 0) {
          @for (product of saleProducts().slice(0, 2); track product.productId) {
            <tcs-product-card [product]="product" />
          }
        } @else {
          <div class="sale-empty">There are no active offers at the moment.</div>
        }
      </div>
    </section>
  `,
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent implements OnInit {
  readonly departments = signal<DepartmentDto[]>([]);
  readonly newArrivals = signal<ProductCardDto[]>([]);
  readonly featured = signal<ProductCardDto[]>([]);
  readonly saleProducts = signal<ProductCardDto[]>([]);
  readonly departmentsLoading = signal(true);
  readonly newArrivalsLoading = signal(true);
  readonly featuredLoading = signal(true);
  readonly saleLoading = signal(true);
  readonly departmentError = signal('');
  readonly newArrivalsError = signal('');
  readonly featuredError = signal('');
  readonly saleError = signal('');
  readonly skeletons = [1, 2, 3, 4];

  constructor(private readonly catalog: CatalogApiService) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.loadNewArrivals();
    this.loadFeatured();
    this.loadSaleProducts();
  }

  loadDepartments(): void {
    this.departmentsLoading.set(true);
    this.departmentError.set('');
    this.catalog.getDepartments().subscribe({
      next: (items) => {
        this.departments.set(items.filter((item) => item.isActive));
        this.departmentsLoading.set(false);
      },
      error: () => {
        this.departmentError.set('Departments could not be loaded. Check the connection and try again.');
        this.departmentsLoading.set(false);
      },
    });
  }

  loadNewArrivals(): void {
    this.newArrivalsError.set('');
    this.newArrivalsLoading.set(true);
    this.catalog.getNewArrivals(1, 4).subscribe({
      next: (page) => {
        this.newArrivals.set(page.items);
        this.newArrivalsLoading.set(false);
      },
      error: () => {
        this.newArrivalsError.set('New arrivals could not be loaded right now.');
        this.newArrivalsLoading.set(false);
      },
    });
  }

  loadFeatured(): void {
    this.featuredError.set('');
    this.featuredLoading.set(true);
    this.catalog.getFeatured(1, 4).subscribe({
      next: (page) => {
        this.featured.set(page.items);
        this.featuredLoading.set(false);
      },
      error: () => {
        this.featuredError.set('The best-seller edit could not be loaded right now.');
        this.featuredLoading.set(false);
      },
    });
  }

  loadSaleProducts(): void {
    this.saleError.set('');
    this.saleLoading.set(true);
    this.catalog.getOnSale(1, 4).subscribe({
      next: (page) => {
        this.saleProducts.set(page.items);
        this.saleLoading.set(false);
      },
      error: () => {
        this.saleError.set('Current offers could not be loaded right now.');
        this.saleLoading.set(false);
      },
    });
  }
}

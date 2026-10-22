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
  templateUrl: './home-page.component.html',
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

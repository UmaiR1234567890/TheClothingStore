import { AsyncPipe, CurrencyPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CategoryDto, DepartmentDto } from '../../core/models/catalog.models';
import { OrderDto } from '../../core/models/commerce.models';
import { CartStateService } from '../../core/services/cart-state.service';
import { CatalogApiService } from '../../core/services/catalog-api.service';
import { OrderApiService } from '../../core/services/order-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';
import { ShipmentTimelineComponent } from './shipment-timeline.component';

interface CategoryMenuItem extends CategoryDto {
  children: CategoryMenuItem[];
}

@Component({
  selector: 'tcs-site-header',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, NgTemplateOutlet, ReactiveFormsModule, RouterLink, RouterLinkActive, ShipmentTimelineComponent],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeaderComponent implements OnInit {
  readonly departments = signal<DepartmentDto[]>([]);
  readonly openSlug = signal<string | null>(null);
  readonly mobileMenuOpen = signal(false);
  readonly loadingSlug = signal<string | null>(null);
  readonly departmentError = signal<string | null>(null);
  readonly searchForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });
  readonly trackOpen = signal(false);
  readonly trackLoading = signal(false);
  readonly trackError = signal('');
  readonly trackResult = signal<OrderDto | null>(null);
  readonly trackForm = new FormGroup({
    orderNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });
  private readonly categoryTrees = new Map<string, CategoryMenuItem[]>();

  constructor(
    readonly auth: AuthService,
    private readonly catalog: CatalogApiService,
    private readonly cartState: CartStateService,
    private readonly router: Router,
    private readonly orders: OrderApiService,
  ) {}

  get cartCount$() {
    return this.cartState.count$;
  }

  ngOnInit(): void {
    this.catalog.getDepartments().subscribe({
      next: (items) => this.departments.set(items.filter((department) => department.isActive)),
      error: () => this.departmentError.set('Departments are temporarily unavailable.'),
    });
    this.cartState.refresh();
  }

  openTrack(): void {
    this.trackOpen.set(true);
    this.trackError.set('');
  }

  closeTrack(): void {
    this.trackOpen.set(false);
  }

  submitTrack(): void {
    if (this.trackForm.invalid) {
      this.trackForm.markAllAsTouched();
      return;
    }
    this.trackLoading.set(true);
    this.trackError.set('');
    const { orderNumber, email } = this.trackForm.getRawValue();
    this.orders.getGuestTracking(orderNumber.trim(), email.trim()).subscribe({
      next: (order) => {
        this.trackResult.set(order);
        this.trackLoading.set(false);
      },
      error: (failure: unknown) => {
        this.trackError.set(parseApiFailure(failure, 'Order not found — check the order number and email.').message);
        this.trackResult.set(null);
        this.trackLoading.set(false);
      },
    });
  }

  submitSearch(): void {
    const term = this.searchForm.controls.search.value.trim();
    if (!term) {
      return;
    }
    this.closeAllMenus();
    void this.router.navigate(['/search'], { queryParams: { Search: term } });
  }

  toggleDepartment(department: DepartmentDto): void {
    if (this.openSlug() === department.slug) {
      this.openSlug.set(null);
      return;
    }
    this.openDepartment(department);
  }

  openDepartment(department: DepartmentDto): void {
    this.openSlug.set(department.slug);
    if (this.categoryTrees.has(department.slug) || this.loadingSlug() === department.slug) {
      return;
    }
    this.loadingSlug.set(department.slug);
    this.catalog.getDepartmentCategories(department.slug).subscribe({
      next: (categories) => {
        this.categoryTrees.set(department.slug, this.toTree(categories));
        this.loadingSlug.set(null);
      },
      error: () => {
        this.departmentError.set('Categories are temporarily unavailable.');
        this.loadingSlug.set(null);
      },
    });
  }

  closeDepartment(slug: string): void {
    if (this.openSlug() === slug) {
      this.openSlug.set(null);
    }
  }

  closeAllMenus(): void {
    this.openSlug.set(null);
    this.mobileMenuOpen.set(false);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((value) => !value);
  }

  categoryTree(slug: string): CategoryMenuItem[] {
    return this.categoryTrees.get(slug) ?? [];
  }

  signOut(): void {
    this.auth.logout().subscribe(() => {
      this.cartState.refresh();
      this.closeAllMenus();
      void this.router.navigate(['/']);
    });
  }

  private toTree(categories: CategoryDto[]): CategoryMenuItem[] {
    const nodes = new Map<number, CategoryMenuItem>();
    for (const category of categories) {
      nodes.set(category.categoryId, { ...category, children: [] });
    }
    const roots: CategoryMenuItem[] = [];
    for (const node of nodes.values()) {
      const parent = node.parentCategoryId === null ? null : nodes.get(node.parentCategoryId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
    const sortNodes = (items: CategoryMenuItem[]): CategoryMenuItem[] => {
      items.sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
      for (const item of items) {
        sortNodes(item.children);
      }
      return items;
    };
    return sortNodes(roots);
  }
}

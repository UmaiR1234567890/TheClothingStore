import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CategoryDto, DepartmentDto } from '../../core/models/catalog.models';
import { CartStateService } from '../../core/services/cart-state.service';
import { CatalogApiService } from '../../core/services/catalog-api.service';

interface CategoryMenuItem extends CategoryDto {
  depth: number;
}

@Component({
  selector: 'tcs-site-header',
  standalone: true,
  imports: [AsyncPipe, ReactiveFormsModule, RouterLink, RouterLinkActive],
  template: `
    <div class="announcement-bar">
      <span>Considered pieces for every day.</span>
      <span class="announcement-bar__right">Designed for the way you move</span>
    </div>
    <header class="header" (keydown.escape)="closeAllMenus()">
      <div class="header__main container">
        <button
          class="icon-button mobile-menu-button"
          type="button"
          aria-label="Toggle navigation"
          [attr.aria-expanded]="mobileMenuOpen()"
          aria-controls="department-navigation"
          (click)="toggleMobileMenu()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            @if (mobileMenuOpen()) {
              <path d="M5 5l14 14M19 5L5 19" />
            } @else {
              <path d="M3 7h18M3 12h18M3 17h18" />
            }
          </svg>
        </button>

        <a class="wordmark" routerLink="/" aria-label="The Clothing Store home">
          <span class="wordmark__small">THE</span>
          <span class="wordmark__main">CLOTHING STORE</span>
          <span class="wordmark__small wordmark__tail">WEAR YOUR STORY</span>
        </a>

        <form class="search-form" [formGroup]="searchForm" (ngSubmit)="submitSearch()">
          <label class="sr-only" for="header-search">Search products</label>
          <input
            id="header-search"
            type="search"
            formControlName="search"
            autocomplete="off"
            placeholder="Search the collection">
          <button type="submit" aria-label="Search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 5 5" />
            </svg>
          </button>
        </form>

        <div class="header-actions">
          @if (auth.user$ | async; as user) {
            <a class="header-action header-account" routerLink="/account/profile">
              <span class="header-action__eyebrow">Welcome</span>
              <span>{{ user.email }}</span>
            </a>
            @if (user.roles.includes('Admin')) {
              <a class="header-action admin-link" routerLink="/admin">Admin</a>
            }
            <button class="header-action signout-button" type="button" (click)="signOut()">
              Sign out
            </button>
          } @else {
            <a class="header-action header-account" routerLink="/login">
              <span class="header-action__eyebrow">Your account</span>
              <span>Sign in</span>
            </a>
          }
          <a class="cart-link" routerLink="/cart" aria-label="Shopping bag">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 8h14l1 13H4L5 8Z" />
              <path d="M9 9V6a3 3 0 0 1 6 0v3" />
            </svg>
            <span>Bag</span>
            @if (cartCount$ | async; as count) {
              @if (count > 0) {
                <span class="cart-count">{{ count > 99 ? '99+' : count }}</span>
              }
            }
          </a>
        </div>
      </div>

      <nav id="department-navigation" class="department-nav" [class.department-nav--open]="mobileMenuOpen()" aria-label="Shop departments">
        <div class="department-nav__inner container">
          @for (department of departments(); track department.departmentId) {
            <div
              class="department-nav__item"
              (mouseenter)="openDepartment(department)"
              (mouseleave)="closeDepartment(department.slug)">
              <button
                type="button"
                class="department-nav__button"
                [attr.aria-expanded]="openSlug() === department.slug"
                [attr.aria-controls]="'department-menu-' + department.slug"
                (click)="toggleDepartment(department)">
                {{ department.name }}
                <span class="department-nav__chevron" aria-hidden="true"></span>
              </button>
              @if (openSlug() === department.slug) {
                <div class="mega-menu" [id]="'department-menu-' + department.slug" (mouseenter)="openDepartment(department)" (mouseleave)="closeDepartment(department.slug)">
                  <div class="mega-menu__intro">
                    <p class="eyebrow">Explore {{ department.name }}</p>
                    <h2>Find your<br>next favourite.</h2>
                    <a class="text-link" [routerLink]="['/', department.slug]" (click)="closeAllMenus()">
                      Shop all {{ department.name }} <span aria-hidden="true">→</span>
                    </a>
                  </div>
                  <div class="mega-menu__categories">
                    @if (loadingSlug() === department.slug) {
                      <span class="mega-menu__loading">Loading categories…</span>
                    } @else {
                      @for (category of categoryTree(department.slug); track category.categoryId) {
                        <div class="mega-menu__group" [style.margin-left.rem]="category.depth * 0.75">
                          <a
                            [class.mega-menu__category]="category.depth === 0"
                            [class.mega-menu__child]="category.depth > 0"
                            [routerLink]="['/category', category.categoryId, category.slug]"
                            (click)="closeAllMenus()">
                            {{ category.name }}
                          </a>
                        </div>
                      } @empty {
                        <span class="mega-menu__loading">Categories are not available right now.</span>
                      }
                    }
                  </div>
                </div>
              }
            </div>
          }
          @if (departmentError()) {
            <span class="department-nav__error" role="status">{{ departmentError() }}</span>
          }
        </div>
      </nav>
    </header>
  `,
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
  private readonly categoryTrees = new Map<string, CategoryMenuItem[]>();

  constructor(
    readonly auth: AuthService,
    private readonly catalog: CatalogApiService,
    private readonly cartState: CartStateService,
    private readonly router: Router,
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
    const byParent = new Map<number | null, CategoryDto[]>();
    for (const category of categories) {
      const siblings = byParent.get(category.parentCategoryId) ?? [];
      siblings.push(category);
      byParent.set(category.parentCategoryId, siblings);
    }
    const flattened: CategoryMenuItem[] = [];
    const addChildren = (parentId: number | null, depth: number): void => {
      const siblings = (byParent.get(parentId) ?? [])
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder);
      for (const category of siblings) {
        flattened.push({ ...category, depth });
        addChildren(category.categoryId, depth + 1);
      }
    };
    addChildren(null, 0);
    return flattened;
  }
}

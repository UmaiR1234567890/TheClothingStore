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

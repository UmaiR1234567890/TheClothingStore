import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CategoryDto, DepartmentDto } from '../../core/models/catalog.models';
import { CartStateService } from '../../core/services/cart-state.service';
import { CatalogApiService } from '../../core/services/catalog-api.service';

interface CategoryMenuItem extends CategoryDto {
  children: CategoryMenuItem[];
}

@Component({
  selector: 'tcs-site-header',
  standalone: true,
  imports: [AsyncPipe, NgTemplateOutlet, ReactiveFormsModule, RouterLink, RouterLinkActive],
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
  readonly menuColumns = signal<CategoryMenuItem[][]>([]);
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
    const cached = this.categoryTrees.get(department.slug);
    if (cached) {
      this.menuColumns.set([cached]);
      return;
    }
    if (this.loadingSlug() === department.slug) {
      return;
    }
    this.menuColumns.set([]);
    this.loadingSlug.set(department.slug);
    this.catalog.getDepartmentCategories(department.slug).subscribe({
      next: (categories) => {
        const tree = this.toTree(categories);
        this.categoryTrees.set(department.slug, tree);
        this.menuColumns.set([tree]);
        this.loadingSlug.set(null);
      },
      error: () => {
        this.departmentError.set('Categories are temporarily unavailable.');
        this.loadingSlug.set(null);
      },
    });
  }

  hoverCategory(columnIndex: number, item: CategoryMenuItem): void {
    const columns = this.menuColumns().slice(0, columnIndex + 1);
    if (item.children.length > 0) {
      columns.push(item.children);
    }
    this.menuColumns.set(columns);
  }

  closeDepartment(slug: string): void {
    if (this.openSlug() === slug) {
      this.openSlug.set(null);
      this.menuColumns.set([]);
    }
  }

  closeAllMenus(): void {
    this.openSlug.set(null);
    this.mobileMenuOpen.set(false);
    this.menuColumns.set([]);
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

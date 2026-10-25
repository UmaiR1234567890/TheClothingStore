import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestOnlyGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/storefront-layout/storefront-layout.component')
        .then((module) => module.StorefrontLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/home/home-page.component')
          .then((module) => module.HomePageComponent),
      },
      {
        path: 'men',
        loadComponent: () => import('./features/catalog/catalog-page.component')
          .then((module) => module.CatalogPageComponent),
        data: { departmentSlug: 'men' },
      },
      {
        path: 'women',
        loadComponent: () => import('./features/catalog/catalog-page.component')
          .then((module) => module.CatalogPageComponent),
        data: { departmentSlug: 'women' },
      },
      {
        path: 'kids',
        loadComponent: () => import('./features/catalog/catalog-page.component')
          .then((module) => module.CatalogPageComponent),
        data: { departmentSlug: 'kids' },
      },
      {
        path: 'category/:categoryId/:slug',
        loadComponent: () => import('./features/catalog/catalog-page.component')
          .then((module) => module.CatalogPageComponent),
        data: { categoryMode: true },
      },
      {
        path: 'search',
        loadComponent: () => import('./features/catalog/catalog-page.component')
          .then((module) => module.CatalogPageComponent),
        data: { searchMode: true },
      },
      {
        path: 'products/:slug',
        loadComponent: () => import('./features/products/product-detail-page.component')
          .then((module) => module.ProductDetailPageComponent),
      },
      {
        path: 'cart',
        loadComponent: () => import('./features/cart/cart-page.component')
          .then((module) => module.CartPageComponent),
      },
      {
        path: 'checkout',
        loadComponent: () => import('./features/checkout/checkout-page.component')
          .then((module) => module.CheckoutPageComponent),
      },
      {
        path: 'account/profile',
        canActivate: [authGuard],
        loadComponent: () => import('./features/account/profile-page.component')
          .then((module) => module.ProfilePageComponent),
      },
      {
        path: 'account/addresses',
        canActivate: [authGuard],
        loadComponent: () => import('./features/addresses/addresses-page.component')
          .then((module) => module.AddressesPageComponent),
      },
      {
        path: 'track',
        loadComponent: () => import('./features/track/order-track-page.component')
          .then((module) => module.OrderTrackPageComponent),
      },
      {
        path: 'account/orders',
        canActivate: [authGuard],
        loadComponent: () => import('./features/orders/order-history-page.component')
          .then((module) => module.OrderHistoryPageComponent),
      },
      {
        path: 'account/orders/:id/tracking',
        canActivate: [authGuard],
        loadComponent: () => import('./features/tracking/tracking-page.component')
          .then((module) => module.TrackingPageComponent),
      },
      {
        path: 'account/orders/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./features/orders/order-detail-page.component')
          .then((module) => module.OrderDetailPageComponent),
      },
      {
        path: 'about',
        loadComponent: () => import('./features/home/information-page.component')
          .then((module) => module.InformationPageComponent),
        data: { page: 'about' },
      },
      {
        path: 'contact',
        loadComponent: () => import('./features/home/information-page.component')
          .then((module) => module.InformationPageComponent),
        data: { page: 'contact' },
      },
      {
        path: 'shipping',
        loadComponent: () => import('./features/home/information-page.component')
          .then((module) => module.InformationPageComponent),
        data: { page: 'shipping' },
      },
      {
        path: 'returns',
        loadComponent: () => import('./features/home/information-page.component')
          .then((module) => module.InformationPageComponent),
        data: { page: 'returns' },
      },
      {
        path: 'privacy',
        loadComponent: () => import('./features/home/information-page.component')
          .then((module) => module.InformationPageComponent),
        data: { page: 'privacy' },
      },
      {
        path: 'terms',
        loadComponent: () => import('./features/home/information-page.component')
          .then((module) => module.InformationPageComponent),
        data: { page: 'terms' },
      },
      {
        path: 'faq',
        loadComponent: () => import('./features/home/information-page.component')
          .then((module) => module.InformationPageComponent),
        data: { page: 'faq' },
      },
      {
        path: 'unauthorized',
        loadComponent: () => import('./features/authentication/unauthorized-page.component')
          .then((module) => module.UnauthorizedPageComponent),
      },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component')
        .then((module) => module.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        canActivate: [guestOnlyGuard],
        loadComponent: () => import('./features/authentication/login-page.component')
          .then((module) => module.LoginPageComponent),
      },
      {
        path: 'register',
        canActivate: [guestOnlyGuard],
        loadComponent: () => import('./features/authentication/register-page.component')
          .then((module) => module.RegisterPageComponent),
      },
      {
        path: 'forgot-password',
        canActivate: [guestOnlyGuard],
        loadComponent: () => import('./features/authentication/forgot-password-page.component')
          .then((module) => module.ForgotPasswordPageComponent),
      },
      {
        path: 'reset-password',
        canActivate: [guestOnlyGuard],
        loadComponent: () => import('./features/authentication/reset-password-page.component')
          .then((module) => module.ResetPasswordPageComponent),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout.component')
        .then((module) => module.AdminLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/admin/admin-dashboard-page.component')
          .then((module) => module.AdminDashboardPageComponent),
      },
      {
        path: 'products/new',
        loadComponent: () => import('./features/admin/admin-product-editor-page.component')
          .then((module) => module.AdminProductEditorPageComponent),
      },
      {
        path: 'products/:id/edit',
        loadComponent: () => import('./features/admin/admin-product-editor-page.component')
          .then((module) => module.AdminProductEditorPageComponent),
      },
      {
        path: 'products/:id/variants',
        loadComponent: () => import('./features/admin/admin-variants-page.component')
          .then((module) => module.AdminVariantsPageComponent),
      },
      {
        path: 'products/:id/images',
        loadComponent: () => import('./features/admin/admin-images-page.component')
          .then((module) => module.AdminImagesPageComponent),
      },
      {
        path: 'products',
        loadComponent: () => import('./features/admin/admin-products-page.component')
          .then((module) => module.AdminProductsPageComponent),
      },
      {
        path: 'categories',
        loadComponent: () => import('./features/admin/admin-categories-page.component')
          .then((module) => module.AdminCategoriesPageComponent),
      },
      {
        path: 'attributes',
        loadComponent: () => import('./features/admin/admin-attributes-page.component')
          .then((module) => module.AdminAttributesPageComponent),
      },
      {
        path: 'sales',
        loadComponent: () => import('./features/admin/admin-sales-page.component')
          .then((module) => module.AdminSalesPageComponent),
      },
      {
        path: 'inventory',
        loadComponent: () => import('./features/admin/admin-inventory-page.component')
          .then((module) => module.AdminInventoryPageComponent),
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./features/admin/admin-order-detail-page.component')
          .then((module) => module.AdminOrderDetailPageComponent),
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/admin/admin-orders-page.component')
          .then((module) => module.AdminOrdersPageComponent),
      },
      {
        path: 'shipments',
        loadComponent: () => import('./features/admin/admin-shipments-page.component')
          .then((module) => module.AdminShipmentsPageComponent),
      },
      {
        path: 'payments',
        loadComponent: () => import('./features/admin/admin-payments-page.component')
          .then((module) => module.AdminPaymentsPageComponent),
      },
      {
        path: 'customers/:id',
        loadComponent: () => import('./features/admin/admin-customer-detail-page.component')
          .then((module) => module.AdminCustomerDetailPageComponent),
      },
      {
        path: 'customers',
        loadComponent: () => import('./features/admin/admin-customers-page.component')
          .then((module) => module.AdminCustomersPageComponent),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./features/home/not-found-page.component')
      .then((module) => module.NotFoundPageComponent),
  },
];

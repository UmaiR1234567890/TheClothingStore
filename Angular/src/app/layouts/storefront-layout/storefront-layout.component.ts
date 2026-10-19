import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteFooterComponent } from '../../shared/components/site-footer.component';
import { SiteHeaderComponent } from '../../shared/components/site-header.component';

@Component({
  selector: 'tcs-storefront-layout',
  standalone: true,
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent],
  template: `
    <tcs-site-header />
    <main id="main-content">
      <router-outlet />
    </main>
    <tcs-site-footer />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontLayoutComponent {}

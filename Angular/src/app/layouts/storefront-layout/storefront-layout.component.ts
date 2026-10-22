import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteFooterComponent } from '../../shared/components/site-footer.component';
import { SiteHeaderComponent } from '../../shared/components/site-header.component';

@Component({
  selector: 'tcs-storefront-layout',
  standalone: true,
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './storefront-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontLayoutComponent {}

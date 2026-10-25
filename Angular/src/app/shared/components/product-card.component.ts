import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCardDto } from '../../core/models/catalog.models';

@Component({
  selector: 'tcs-product-card',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  @Input({ required: true }) product!: ProductCardDto;
  imageFailed = false;

  hasRegularPrice(): boolean {
    return this.product.regularMinPrice != null && this.product.regularMaxPrice != null;
  }

  imageSource(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    return path.startsWith('/') ? path : `/${path}`;
  }
}

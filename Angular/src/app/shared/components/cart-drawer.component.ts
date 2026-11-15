import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartLineDto } from '../../core/models/commerce.models';
import { CartStateService } from '../../core/services/cart-state.service';

@Component({
  selector: 'tcs-cart-drawer',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawerComponent {
  constructor(readonly cartState: CartStateService) {}

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.cartState.drawerOpen()) {
      this.cartState.closeDrawer();
    }
  }

  hasUnavailable(): boolean {
    return this.cartState.cart()?.items.some((line) => !line.isAvailable || line.quantity > line.quantityAvailable) ?? false;
  }

  productMark(name: string): string {
    return name.trim().slice(0, 1).toUpperCase() || 'T';
  }

  optionText(line: CartLineDto): string {
    const options = [
      line.options.colorName,
      line.options.sizeName,
      line.options.volumeMl ? `${line.options.volumeMl} ml` : null,
    ].filter((value): value is string => Boolean(value));
    return options.join(' / ') || 'Standard option';
  }

  itemsLabel(count: number): string {
    return `${count} ${count === 1 ? 'item' : 'items'}`;
  }
}

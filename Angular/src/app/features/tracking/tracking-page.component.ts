import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderDto, ShipmentDto } from '../../core/models/commerce.models';
import { OrderApiService } from '../../core/services/order-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

const TIMELINE = ['Pending', 'Packed', 'Shipped', 'Delivered'] as const;

@Component({
  selector: 'tcs-tracking-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './tracking-page.component.html',
  styleUrl: '../orders/orders-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackingPageComponent implements OnInit {
  readonly order = signal<OrderDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly orders: OrderApiService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('Order was not found.');
      this.loading.set(false);
      return;
    }
    this.orders.getTracking(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'We could not load tracking information.').message);
        this.loading.set(false);
      },
    });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'Pending': return 'Shipment created';
      case 'Packed': return 'Packed at warehouse';
      case 'InTransit': return 'In transit';
      case 'OutForDelivery': return 'Arrived in city — out for delivery';
      default: return status;
    }
  }

  stepsFor(shipment: ShipmentDto): { label: string; state: 'done' | 'current' | 'todo' }[] {
    if (shipment.status === 'Returned') {
      return TIMELINE.map((step) => ({
        label: this.statusLabel(step),
        state: step === 'Delivered' ? 'current' : 'todo',
      }));
    }
    // Legacy statuses map onto the simplified timeline position.
    const effective = shipment.status === 'InTransit' || shipment.status === 'OutForDelivery'
      ? 'Shipped'
      : shipment.status;
    const index = TIMELINE.indexOf(effective as (typeof TIMELINE)[number]);
    return TIMELINE.map((step, i) => ({
      label: this.statusLabel(step),
      state: i < index ? 'done' : i === index ? 'current' : 'todo',
    }));
  }
}

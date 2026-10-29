import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ShipmentDto } from '../../core/models/commerce.models';

const TIMELINE = ['Pending', 'Packed', 'Shipped', 'Delivered'] as const;

@Component({
  selector: 'tcs-shipment-timeline',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="tracking-card__main">
      <div class="tracking-card__top">
        <div><span class="eyebrow">Shipment {{ shipment.shipmentId }}</span><h2>{{ statusLabel(shipment.status) }}</h2></div>
        <span class="status-pill" [attr.data-status]="shipment.status.toLowerCase()">{{ statusLabel(shipment.status) }}</span>
      </div>
      <ol class="tracking-steps" aria-label="Shipment progress">
        @for (step of stepsFor(); track step.label) {
          <li [attr.data-state]="step.state">
            <span class="tracking-steps__dot" aria-hidden="true"></span>
            <span class="tracking-steps__label">{{ step.label }}</span>
            @if (step.at) { <span class="tracking-steps__time">{{ step.at | date:'MMM d, y, h:mm a' }}</span> }
          </li>
        }
        @if (shipment.status === 'Returned') {
          <li data-state="returned"><span class="tracking-steps__dot" aria-hidden="true"></span>Returned to sender</li>
        }
      </ol>
      <div class="tracking-card__details">
        @if (shipment.carrier) { <div><span>Carrier</span><strong>{{ shipment.carrier }}</strong></div> }
        @if (shipment.trackingNumber) { <div><span>Tracking number</span><strong>{{ shipment.trackingNumber }}</strong></div> }
        @if (shipment.shippedAt) { <div><span>Shipped</span><strong>{{ shipment.shippedAt | date:'medium' }}</strong></div> }
        @if (shipment.deliveredAt) { <div><span>Delivered</span><strong>{{ shipment.deliveredAt | date:'medium' }}</strong></div> }
      </div>
    </div>
  `,
  styleUrl: '../../features/orders/orders-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShipmentTimelineComponent {
  @Input({ required: true }) shipment!: ShipmentDto;

  statusLabel(status: string): string {
    switch (status) {
      case 'Pending': return 'Shipment created';
      case 'Packed': return 'Packed at warehouse';
      case 'InTransit': return 'In transit';
      case 'OutForDelivery': return 'Arrived in city — out for delivery';
      default: return status;
    }
  }

  stepsFor(): { label: string; state: 'done' | 'current' | 'todo'; at: string | null }[] {
    if (this.shipment.status === 'Returned') {
      return TIMELINE.map((step) => ({
        label: this.statusLabel(step),
        state: step === 'Delivered' ? 'current' : 'todo',
        at: this.timeFor(step),
      }));
    }
    const effective = this.shipment.status === 'InTransit' || this.shipment.status === 'OutForDelivery'
      ? 'Shipped'
      : this.shipment.status;
    const index = TIMELINE.indexOf(effective as (typeof TIMELINE)[number]);
    return TIMELINE.map((step, i) => ({
      label: this.statusLabel(step),
      state: i < index ? 'done' : i === index ? 'current' : 'todo',
      at: this.timeFor(step),
    }));
  }

  private timeFor(step: string): string | null {
    if (step === 'Pending') {
      return this.shipment.createdAt;
    }
    if (step === 'Packed') {
      return this.shipment.packedAt;
    }
    if (step === 'Shipped') {
      return this.shipment.shippedAt;
    }
    if (step === 'Delivered') {
      return this.shipment.deliveredAt;
    }
    return null;
  }
}

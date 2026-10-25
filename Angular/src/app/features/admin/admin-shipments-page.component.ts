import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CarrierDto, ShipmentWriteRequest } from '../../core/models/admin.models';
import { OrderDto, ShipmentDto } from '../../core/models/commerce.models';
import { PagedResult } from '../../core/models/api.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-shipments-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-shipments-page.component.html',
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShipmentsPageComponent implements OnInit {
  readonly shipments = signal<PagedResult<ShipmentDto> | null>(null);
  readonly carriers = signal<CarrierDto[]>([]);
  readonly shippableOrders = signal<OrderDto[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly orderSearch = new FormControl('', { nonNullable: true });
  readonly selectedOrder = signal<OrderDto | null>(null);
  readonly orderPickerOpen = signal(false);
  readonly form = new FormGroup({
    carrier: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(80)] }),
    trackingNumber: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(80)] }),
  });

  constructor(private readonly admin: AdminApiService) {}

  ngOnInit(): void {
    this.load();
    this.admin.getCarriers().subscribe({
      next: (carriers) => this.carriers.set(carriers),
      error: () => this.carriers.set([]),
    });
    this.admin.getOrders(1, 100).subscribe({
      next: (result) => this.shippableOrders.set(
        result.items.filter((order) => order.status !== 'Cancelled' && order.status !== 'Refunded')),
      error: () => this.shippableOrders.set([]),
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin.getShipments(1, 100).subscribe({
      next: (result) => {
        this.shipments.set(result);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Shipments could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'Pending': return 'Shipment created';
      case 'InTransit': return 'In transit';
      case 'OutForDelivery': return 'Out for delivery';
      default: return status;
    }
  }

  filteredOrders(): OrderDto[] {
    const term = this.orderSearch.value.trim().toLowerCase();
    const orders = this.shippableOrders();
    if (!term) {
      return orders;
    }
    return orders.filter((order) =>
      order.orderNumber.toLowerCase().includes(term) ||
      String(order.orderId).includes(term) ||
      (order.guestEmail ?? '').toLowerCase().includes(term));
  }

  pickOrder(order: OrderDto): void {
    this.selectedOrder.set(order);
    this.orderPickerOpen.set(false);
    this.orderSearch.setValue('');
    if (!this.form.controls.trackingNumber.value.trim()) {
      this.generateTrackingNumber();
    }
  }

  clearOrder(): void {
    this.selectedOrder.set(null);
  }

  shipmentBadgeClass(status: string): string {
    switch (status) {
      case 'Delivered': return 'admin-badge--success';
      case 'Shipped': case 'InTransit': case 'OutForDelivery': return 'admin-badge--info';
      case 'Returned': return 'admin-badge--danger';
      default: return 'admin-badge--warn';
    }
  }

  nextStatuses(shipment: ShipmentDto): string[] {
    switch (shipment.status) {
      case 'Pending': return ['Packed'];
      case 'Packed': return ['Shipped'];
      case 'Shipped': return ['Delivered', 'Returned'];
      case 'InTransit': return ['OutForDelivery', 'Delivered', 'Returned'];
      case 'OutForDelivery': return ['Delivered', 'Returned'];
      case 'Delivered': return ['Returned'];
      default: return [];
    }
  }

  changeStatus(shipment: ShipmentDto, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !target.value) {
      return;
    }
    this.admin.setShipmentStatus(shipment.shipmentId, target.value).subscribe({
      next: () => {
        this.message.set(`Shipment #${shipment.shipmentId} updated to ${this.statusLabel(target.value)}.`);
        this.load();
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Shipment status could not be changed.').message);
        target.value = '';
      },
    });
  }

  generateTrackingNumber(): void {
    const carrier = this.form.controls.carrier.value.trim();
    const code = (this.carriers().find((c) => c.name === carrier)?.code || 'TCS').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8) || 'TCS';
    const stamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(2, 14);
    const random = Math.floor(1000 + Math.random() * 9000);
    this.form.controls.trackingNumber.setValue(`${code}-${stamp}-${random}`);
    this.form.controls.trackingNumber.markAsDirty();
  }

  create(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    const order = this.selectedOrder();
    if (order === null || this.form.invalid || this.saving()) {
      this.error.set('Search and pick an order before creating a shipment.');
      return;
    }
    const value = this.form.getRawValue();
    const request: ShipmentWriteRequest = {
      orderId: order.orderId,
      carrier: value.carrier.trim() || null,
      trackingNumber: value.trackingNumber.trim() || null,
      status: 'Pending',
    };
    this.saving.set(true);
    this.admin.createShipment(request).subscribe({
      next: () => {
        this.message.set(`Shipment created for ${order.orderNumber} in Pending status.`);
        this.form.reset({ carrier: '', trackingNumber: '' });
        this.selectedOrder.set(null);
        this.saving.set(false);
        this.load();
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Shipment could not be created.').message);
        this.saving.set(false);
      },
    });
  }
}

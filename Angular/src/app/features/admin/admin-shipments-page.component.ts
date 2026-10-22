import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ShipmentWriteRequest } from '../../core/models/admin.models';
import { ShipmentDto } from '../../core/models/commerce.models';
import { PagedResult } from '../../core/models/api.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-shipments-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './admin-shipments-page.component.html',
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShipmentsPageComponent implements OnInit {
  readonly shipments = signal<PagedResult<ShipmentDto> | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly form = new FormGroup({
    orderId: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    carrier: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(80)] }),
    trackingNumber: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(80)] }),
  });

  constructor(private readonly admin: AdminApiService) {}

  ngOnInit(): void {
    this.load();
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

  nextStatuses(shipment: ShipmentDto): string[] {
    switch (shipment.status) {
      case 'Pending': return ['Packed'];
      case 'Packed': return ['Shipped'];
      case 'Shipped': return ['Delivered', 'Returned'];
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
        this.message.set(`Shipment #${shipment.shipmentId} updated.`);
        this.load();
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Shipment status could not be changed.').message);
        target.value = '';
      },
    });
  }

  create(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    if (this.form.invalid || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    const request: ShipmentWriteRequest = {
      orderId: value.orderId!,
      carrier: value.carrier.trim() || null,
      trackingNumber: value.trackingNumber.trim() || null,
      status: 'Pending',
    };
    this.saving.set(true);
    this.admin.createShipment(request).subscribe({
      next: () => {
        this.message.set('Shipment created in Pending status.');
        this.form.reset({ orderId: null, carrier: '', trackingNumber: '' });
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

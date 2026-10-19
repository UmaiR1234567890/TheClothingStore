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
  template: `
    <section class="admin-page">
      <div class="admin-page-heading">
        <div><p class="eyebrow">Operations / Fulfillment</p><h1 class="page-title">Shipments.</h1></div>
      </div>
      @if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
      @if (message()) { <p class="notice notice-success" role="status">{{ message() }}</p> }
      @if (loading()) { <div class="state-panel"><span class="spinner" aria-label="Loading shipments"></span></div> }
      @else {
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Shipment</th><th>Order</th><th>Carrier</th><th>Tracking</th><th>Status</th><th>Dates</th><th>Next step</th></tr></thead>
            <tbody>
              @for (shipment of shipments()?.items ?? []; track shipment.shipmentId) {
                <tr>
                  <td>#{{ shipment.shipmentId }}</td>
                  <td>#{{ shipment.orderId }}</td>
                  <td>{{ shipment.carrier || '—' }}</td>
                  <td>{{ shipment.trackingNumber || '—' }}</td>
                  <td><span class="admin-badge">{{ shipment.status }}</span></td>
                  <td><small>{{ shipment.shippedAt ? (shipment.shippedAt | date:'shortDate') : 'Not shipped' }}</small></td>
                  <td>
                    @if (nextStatuses(shipment).length > 0) {
                      <select class="admin-filter" (change)="changeStatus(shipment, $event)" aria-label="Change shipment status">
                        <option value="">Choose…</option>
                        @for (status of nextStatuses(shipment); track status) { <option [value]="status">{{ status }}</option> }
                      </select>
                    } @else { <span class="muted-copy">No transition</span> }
                  </td>
                </tr>
              } @empty { <tr><td colspan="7">No shipments have been created.</td></tr> }
            </tbody>
          </table>
        </div>
        <form class="admin-form-card" [formGroup]="form" (ngSubmit)="create()">
          <p class="eyebrow">Fulfillment</p><h2>Create a shipment</h2>
          <p class="muted-copy">New shipments start Pending. Shipment progress does not change payment status.</p>
          <div class="admin-form-grid">
            <div class="field"><label for="shipment-order">Order ID</label><input id="shipment-order" class="control" type="number" min="1" formControlName="orderId"></div>
            <div class="field"><label for="shipment-carrier">Carrier</label><input id="shipment-carrier" class="control" formControlName="carrier"></div>
          </div>
          <div class="field"><label for="shipment-tracking">Tracking number</label><input id="shipment-tracking" class="control" formControlName="trackingNumber"></div>
          <button class="btn btn-primary" type="submit" [disabled]="saving()">{{ saving() ? 'Creating…' : 'Create shipment' }}</button>
        </form>
      }
    </section>
  `,
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

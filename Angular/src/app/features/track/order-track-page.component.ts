import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { OrderDto } from '../../core/models/commerce.models';
import { OrderApiService } from '../../core/services/order-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';
import { ShipmentTimelineComponent } from '../../shared/components/shipment-timeline.component';

@Component({
  selector: 'tcs-order-track-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, ShipmentTimelineComponent],
  templateUrl: './order-track-page.component.html',
  styleUrl: '../orders/orders-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTrackPageComponent implements OnInit {
  readonly order = signal<OrderDto | null>(null);
  readonly searching = signal(false);
  readonly error = signal('');
  readonly form = new FormGroup({
    orderNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly orders: OrderApiService,
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const number = params.get('number') ?? '';
    const email = params.get('email') ?? '';
    if (number || email) {
      this.form.patchValue({ orderNumber: number, email });
    }
    if (number && email) {
      this.submit();
    }
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    if (this.form.invalid || this.searching()) {
      return;
    }
    const { orderNumber, email } = this.form.getRawValue();
    this.searching.set(true);
    this.orders.getGuestTracking(orderNumber.trim(), email.trim()).subscribe({
      next: (order) => {
        this.order.set(order);
        this.searching.set(false);
      },
      error: (failure: unknown) => {
        this.order.set(null);
        this.error.set(parseApiFailure(failure, 'No order matches that number and email.').message);
        this.searching.set(false);
      },
    });
  }
}

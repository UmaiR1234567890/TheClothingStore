import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CustomerAddressDto } from '../../core/models/commerce.models';
import { CustomerApiService } from '../../core/services/customer-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-addresses-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './addresses-page.component.html',
  styleUrl: '../account/account-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressesPageComponent implements OnInit {
  readonly addresses = signal<CustomerAddressDto[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly error = signal('');
  readonly message = signal('');
  readonly form = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(160)] }),
    line1: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    line2: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    region: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    postalCode: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(20)] }),
    country: new FormControl('Pakistan', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
    isDefaultShipping: new FormControl(false, { nonNullable: true }),
    isDefaultBilling: new FormControl(false, { nonNullable: true }),
  });

  constructor(private readonly customers: CustomerApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.customers.getAddresses().subscribe({
      next: (addresses) => {
        this.addresses.set(addresses);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'We could not load your addresses.').message);
        this.loading.set(false);
      },
    });
  }

  startCreate(): void {
    this.error.set('');
    this.message.set('');
    this.editingId.set(null);
    this.form.reset({
      fullName: '',
      line1: '',
      line2: '',
      city: '',
      region: '',
      postalCode: '',
      country: 'Pakistan',
      phone: '',
      isDefaultShipping: this.addresses().length === 0,
      isDefaultBilling: this.addresses().length === 0,
    });
    this.editing.set(true);
  }

  startEdit(address: CustomerAddressDto): void {
    this.error.set('');
    this.message.set('');
    this.editingId.set(address.customerAddressId);
    this.form.patchValue({
      fullName: address.fullName,
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      region: address.region ?? '',
      postalCode: address.postalCode ?? '',
      country: address.country,
      phone: address.phone ?? '',
      isDefaultShipping: address.isDefaultShipping,
      isDefaultBilling: address.isDefaultBilling,
    });
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
    this.editingId.set(null);
  }

  save(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    this.message.set('');
    if (this.form.invalid || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    const request = {
      ...value,
      fullName: value.fullName.trim(),
      line1: value.line1.trim(),
      line2: value.line2.trim() || null,
      city: value.city.trim(),
      region: value.region.trim() || null,
      postalCode: value.postalCode.trim() || null,
      country: value.country.trim(),
      phone: value.phone.trim() || null,
    };
    this.saving.set(true);
    const id = this.editingId();
    const request$ = id === null
      ? this.customers.createAddress(request)
      : this.customers.updateAddress(id, request);
    request$.subscribe({
      next: () => {
        this.message.set(id === null ? 'Address added.' : 'Address updated.');
        this.saving.set(false);
        this.editing.set(false);
        this.editingId.set(null);
        this.load();
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'We could not save your address.').message);
        this.saving.set(false);
      },
    });
  }

  remove(address: CustomerAddressDto): void {
    if (!window.confirm(`Remove the saved address for ${address.fullName}?`)) {
      return;
    }
    this.error.set('');
    this.customers.deleteAddress(address.customerAddressId).subscribe({
      next: () => {
        this.message.set('Address removed.');
        this.load();
      },
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'We could not remove the address.').message),
    });
  }

  setDefault(address: CustomerAddressDto): void {
    this.error.set('');
    this.customers.setDefaultAddress(address.customerAddressId).subscribe({
      next: () => {
        this.message.set('Default shipping and billing address updated.');
        this.load();
      },
      error: (failure: unknown) => this.error.set(parseApiFailure(failure, 'We could not update the default address.').message),
    });
  }
}

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
  template: `
    <section class="account-page container">
      <div class="account-heading">
        <div><p class="eyebrow">Your account</p><h1 class="page-title">Addresses.</h1></div>
        <nav class="account-nav" aria-label="Account navigation">
          <a routerLink="/account/profile">Profile</a>
          <a class="is-active" routerLink="/account/addresses">Addresses</a>
          <a routerLink="/account/orders">Orders</a>
        </nav>
      </div>

      @if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
      @if (message()) { <p class="notice notice-success" role="status">{{ message() }}</p> }

      <div class="address-toolbar">
        <p class="page-intro">Keep delivery details close. Only you can view and manage your saved addresses.</p>
        <button class="btn btn-primary" type="button" (click)="startCreate()">Add address</button>
      </div>

      @if (editing()) {
        <form class="account-card address-form" [formGroup]="form" (ngSubmit)="save()">
          <div class="account-card__heading">
            <h2>{{ editingId() ? 'Edit address' : 'New address' }}</h2>
            <button class="text-button" type="button" (click)="cancelEdit()">Cancel</button>
          </div>
          <div class="account-form-grid">
            <div class="field">
              <label for="address-name">Recipient name</label>
              <input id="address-name" class="control" formControlName="fullName" autocomplete="name">
            </div>
            <div class="field">
              <label for="address-phone">Phone</label>
              <input id="address-phone" class="control" type="tel" formControlName="phone" autocomplete="tel">
            </div>
          </div>
          <div class="field">
            <label for="address-line1">Address line 1</label>
            <input id="address-line1" class="control" formControlName="line1" autocomplete="address-line1">
          </div>
          <div class="field">
            <label for="address-line2">Address line 2 <span class="field-optional">Optional</span></label>
            <input id="address-line2" class="control" formControlName="line2" autocomplete="address-line2">
          </div>
          <div class="account-form-grid">
            <div class="field">
              <label for="address-city">City</label>
              <input id="address-city" class="control" formControlName="city" autocomplete="address-level2">
            </div>
            <div class="field">
              <label for="address-region">Province / region</label>
              <input id="address-region" class="control" formControlName="region" autocomplete="address-level1">
            </div>
          </div>
          <div class="account-form-grid">
            <div class="field">
              <label for="address-postal">Postal code</label>
              <input id="address-postal" class="control" formControlName="postalCode" autocomplete="postal-code">
            </div>
            <div class="field">
              <label for="address-country">Country</label>
              <input id="address-country" class="control" formControlName="country" autocomplete="country-name">
            </div>
          </div>
          <div class="address-checkboxes">
            <label><input type="checkbox" formControlName="isDefaultShipping"> Default shipping address</label>
            <label><input type="checkbox" formControlName="isDefaultBilling"> Default billing address</label>
          </div>
          <button class="btn btn-accent" type="submit" [disabled]="saving()">
            {{ saving() ? 'Saving…' : editingId() ? 'Save address' : 'Add address' }}
          </button>
        </form>
      }

      @if (loading()) {
        <div class="state-panel"><span class="spinner" aria-label="Loading addresses"></span></div>
      } @else if (addresses().length === 0 && !editing()) {
        <div class="state-panel"><h2>No saved addresses</h2><p>Add an address to make checkout simpler.</p></div>
      } @else {
        <div class="address-grid">
          @for (address of addresses(); track address.customerAddressId) {
            <article class="address-card">
              <div class="address-card__badges">
                @if (address.isDefaultShipping) { <span>Default shipping</span> }
                @if (address.isDefaultBilling) { <span>Default billing</span> }
              </div>
              <h2>{{ address.fullName }}</h2>
              <p>{{ address.line1 }}@if (address.line2) {<br>{{ address.line2 }}},<br>
                {{ address.city }}@if (address.region) {, {{ address.region }}}
                @if (address.postalCode) { {{ address.postalCode }}}
                <br>{{ address.country }}
                @if (address.phone) {<br>{{ address.phone }}}
              </p>
              <div class="address-card__actions">
                <button class="text-button" type="button" (click)="startEdit(address)">Edit</button>
                <button class="text-button text-button--danger" type="button" (click)="remove(address)">Remove</button>
                @if (!address.isDefaultShipping || !address.isDefaultBilling) {
                  <button class="text-button" type="button" (click)="setDefault(address)">Make default</button>
                }
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
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

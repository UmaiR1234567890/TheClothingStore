import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CustomerProfileDto } from '../../core/models/commerce.models';
import { CustomerApiService } from '../../core/services/customer-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

const matchingNewPassword: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  control.get('newPassword')?.value === control.get('confirmPassword')?.value ? null : { passwordMismatch: true };

@Component({
  selector: 'tcs-profile-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="account-page container">
      <div class="account-heading">
        <div><p class="eyebrow">Your account</p><h1 class="page-title">Profile.</h1></div>
        <nav class="account-nav" aria-label="Account navigation">
          <a class="is-active" routerLink="/account/profile">Profile</a>
          <a routerLink="/account/addresses">Addresses</a>
          <a routerLink="/account/orders">Orders</a>
        </nav>
      </div>

      @if (loading()) {
        <div class="state-panel"><span class="spinner" aria-label="Loading profile"></span></div>
      } @else if (error() && !profile()) {
        <div class="state-panel state-panel--error" role="alert"><h2>Profile unavailable</h2><p>{{ error() }}</p></div>
      } @else {
        <div class="account-card">
          <div class="account-card__copy">
            <h2>Your details</h2>
            <p>Email is managed by your sign-in account. Contact support to change it.</p>
            <p class="account-email">{{ profile()?.email }}</p>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="account-form-grid">
              <div class="field">
                <label for="profile-first">First name</label>
                <input id="profile-first" class="control" formControlName="firstName" autocomplete="given-name">
                @if (form.controls.firstName.touched && form.controls.firstName.invalid) { <span class="field-error">First name is required.</span> }
              </div>
              <div class="field">
                <label for="profile-last">Last name</label>
                <input id="profile-last" class="control" formControlName="lastName" autocomplete="family-name">
                @if (form.controls.lastName.touched && form.controls.lastName.invalid) { <span class="field-error">Last name is required.</span> }
              </div>
            </div>
            <div class="field">
              <label for="profile-phone">Phone <span class="field-optional">Optional</span></label>
              <input id="profile-phone" class="control" type="tel" formControlName="phone" autocomplete="tel">
            </div>
            @if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
            @if (message()) { <p class="notice notice-success" role="status">{{ message() }}</p> }
            <button class="btn btn-primary" type="submit" [disabled]="saving()">
              {{ saving() ? 'Saving…' : 'Save changes' }}
            </button>
          </form>
        </div>
        <section class="account-card account-password-card">
          <div class="account-card__copy">
            <h2>Change password</h2>
            <p>Passwords are sent only to the API and are never stored by the storefront.</p>
          </div>
          <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
            <div class="field">
              <label for="current-password">Current password</label>
              <input id="current-password" class="control" type="password" formControlName="currentPassword" autocomplete="current-password">
            </div>
            <div class="field">
              <label for="new-password">New password</label>
              <input id="new-password" class="control" type="password" formControlName="newPassword" autocomplete="new-password">
              <small class="field-hint">At least 10 characters; include upper- and lowercase, a number, and a symbol.</small>
              @if (passwordForm.controls.newPassword.touched && passwordForm.controls.newPassword.invalid) {
                <span class="field-error">Use a password that meets the requirements.</span>
              }
            </div>
            <div class="field">
              <label for="confirm-new-password">Confirm new password</label>
              <input id="confirm-new-password" class="control" type="password" formControlName="confirmPassword" autocomplete="new-password">
              @if (passwordForm.controls.confirmPassword.touched && passwordForm.hasError('passwordMismatch')) {
                <span class="field-error">Passwords must match.</span>
              }
            </div>
            @if (passwordError()) { <p class="notice notice-error" role="alert">{{ passwordError() }}</p> }
            @if (passwordMessage()) { <p class="notice notice-success" role="status">{{ passwordMessage() }}</p> }
            <button class="btn btn-outline" type="submit" [disabled]="passwordSaving()">
              {{ passwordSaving() ? 'Updating…' : 'Update password' }}
            </button>
          </form>
        </section>
      }
    </section>
  `,
  styleUrl: './account-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent implements OnInit {
  readonly profile = signal<CustomerProfileDto | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly passwordSaving = signal(false);
  readonly passwordError = signal('');
  readonly passwordMessage = signal('');
  readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
  });
  readonly passwordForm = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(10),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/),
      ],
    }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  }, { validators: [matchingNewPassword] });

  constructor(
    private readonly customers: CustomerApiService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.customers.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.form.patchValue({
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
          phone: profile.phone ?? '',
        });
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'We could not load your profile.').message);
        this.loading.set(false);
      },
    });
  }

  save(): void {
    this.form.markAllAsTouched();
    this.message.set('');
    this.error.set('');
    if (this.form.invalid || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.customers.updateProfile({
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      phone: value.phone.trim() || null,
    }).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.message.set('Profile updated.');
        this.saving.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'We could not save your profile.').message);
        this.saving.set(false);
      },
    });
  }

  changePassword(): void {
    this.passwordForm.markAllAsTouched();
    this.passwordError.set('');
    this.passwordMessage.set('');
    if (this.passwordForm.invalid || this.passwordSaving()) {
      return;
    }
    const value = this.passwordForm.getRawValue();
    this.passwordSaving.set(true);
    this.auth.changePassword({
      currentPassword: value.currentPassword,
      newPassword: value.newPassword,
    }).subscribe({
      next: () => {
        this.passwordMessage.set('Password changed.');
        this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
        this.passwordSaving.set(false);
      },
      error: (failure: unknown) => {
        this.passwordError.set(parseApiFailure(failure, 'Password could not be changed.').message);
        this.passwordSaving.set(false);
      },
    });
  }
}

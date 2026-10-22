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
  templateUrl: './profile-page.component.html',
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

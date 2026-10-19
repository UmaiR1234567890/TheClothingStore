import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-form-card">
      <p class="eyebrow">Account recovery</p>
      <h1 class="auth-form-card__title">Set a new password.</h1>
      <p class="auth-form-card__intro">Use the email and reset token from the recovery link.</p>
      @if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
      @if (message()) { <p class="notice notice-success" role="status">{{ message() }}</p> }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label for="reset-email">Email address</label>
          <input id="reset-email" class="control" type="email" formControlName="email" autocomplete="email">
        </div>
        <div class="field">
          <label for="reset-token">Reset token</label>
          <textarea id="reset-token" class="control" rows="3" formControlName="token" autocomplete="off"></textarea>
        </div>
        <div class="field">
          <label for="reset-password">New password</label>
          <input id="reset-password" class="control" type="password" formControlName="newPassword" autocomplete="new-password">
          @if (form.controls.newPassword.touched && form.controls.newPassword.invalid) { <span class="field-error">Password must be at least 10 characters.</span> }
        </div>
        <button class="btn btn-primary auth-submit" type="submit" [disabled]="loading()">
          {{ loading() ? 'Updating…' : 'Update password' }}
        </button>
      </form>
      <a class="auth-home-link" routerLink="/login">Back to sign in</a>
    </div>
  `,
  styleUrl: './authentication-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPageComponent {
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(256)] }),
    token: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10)] }),
  });
  readonly loading = signal(false);
  readonly error = signal('');
  readonly message = signal('');

  constructor(
    private readonly auth: AuthService,
    route: ActivatedRoute,
  ) {
    this.form.patchValue({
      email: route.snapshot.queryParamMap.get('email') ?? '',
      token: route.snapshot.queryParamMap.get('token') ?? '',
    });
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    this.message.set('');
    if (this.form.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.auth.resetPassword(this.form.getRawValue()).subscribe({
      next: () => {
        this.message.set('Password updated. You can now sign in.');
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Password reset is unavailable.').message);
        this.loading.set(false);
      },
    });
  }
}

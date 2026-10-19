import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-form-card">
      <p class="eyebrow">Account recovery</p>
      <h1 class="auth-form-card__title">Forgot password?</h1>
      <p class="auth-form-card__intro">Enter your email to request a reset link.</p>
      @if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
      @if (message()) { <p class="notice" role="status">{{ message() }}</p> }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label for="forgot-email">Email address</label>
          <input id="forgot-email" class="control" type="email" formControlName="email" autocomplete="email">
          @if (form.controls.email.touched && form.controls.email.invalid) { <span class="field-error">Enter a valid email address.</span> }
        </div>
        <button class="btn btn-primary auth-submit" type="submit" [disabled]="loading()">
          {{ loading() ? 'Requesting…' : 'Request reset' }}
        </button>
      </form>
      <a class="auth-home-link" routerLink="/login">Back to sign in</a>
    </div>
  `,
  styleUrl: './authentication-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPageComponent {
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(256)] }),
  });
  readonly loading = signal(false);
  readonly error = signal('');
  readonly message = signal('');

  constructor(private readonly auth: AuthService) {}

  submit(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    this.message.set('');
    if (this.form.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.auth.requestPasswordReset({ email: this.form.controls.email.value.trim() }).subscribe({
      next: () => {
        this.message.set('If the account exists, reset instructions will be sent.');
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Password recovery is unavailable.').message);
        this.loading.set(false);
      },
    });
  }
}

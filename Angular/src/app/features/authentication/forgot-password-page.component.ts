import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password-page.component.html',
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

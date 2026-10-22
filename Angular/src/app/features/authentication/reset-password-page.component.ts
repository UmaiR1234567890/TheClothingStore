import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password-page.component.html',
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

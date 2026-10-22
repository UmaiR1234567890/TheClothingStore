import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CartApiService } from '../../core/services/cart-api.service';
import { CartStateService } from '../../core/services/cart-state.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './authentication-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(256)] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly loading = signal(false);
  readonly error = signal('');
  readonly cartNotice = signal('');
  readonly showPassword = signal(false);

  constructor(
    private readonly auth: AuthService,
    private readonly carts: CartApiService,
    private readonly cartState: CartStateService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    this.cartNotice.set('');
    if (this.form.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).pipe(
      switchMap(() => this.carts.mergeGuestCart().pipe(
        catchError((failure: unknown) => {
          this.cartNotice.set(`Signed in. Your guest bag could not be merged: ${parseApiFailure(failure).message}`);
          return of(null);
        }),
      )),
    ).subscribe({
      next: (cart) => {
        if (cart) {
          this.cartState.setCount(cart.totalQuantity);
        } else {
          this.cartState.refresh();
        }
        this.loading.set(false);
        void this.router.navigateByUrl(this.safeReturnUrl());
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'We could not sign you in.').message);
        this.loading.set(false);
      },
    });
  }

  private safeReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/') && !returnUrl.startsWith('//') && !returnUrl.startsWith('/login')
      ? returnUrl
      : '/';
  }
}

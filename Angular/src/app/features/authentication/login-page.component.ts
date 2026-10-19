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
  template: `
    <div class="auth-form-card">
      <p class="eyebrow">Welcome back</p>
      <h1 class="auth-form-card__title">Sign in.</h1>
      <p class="auth-form-card__intro">Your considered collection is waiting.</p>

      @if (error()) {
        <p class="notice notice-error" role="alert">{{ error() }}</p>
      }
      @if (cartNotice()) {
        <p class="notice" role="status">{{ cartNotice() }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label for="login-email">Email address</label>
          <input id="login-email" class="control" type="email" formControlName="email" autocomplete="email">
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <span class="field-error">Enter a valid email address.</span>
          }
        </div>
        <div class="field">
          <div class="auth-field-heading">
            <label for="login-password">Password</label>
            <a routerLink="/forgot-password">Forgot password?</a>
          </div>
          <div class="password-control">
            <input
              id="login-password"
              class="control"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password">
            <button type="button" (click)="togglePassword()">
              {{ showPassword() ? 'Hide' : 'Show' }}
            </button>
          </div>
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <span class="field-error">Enter your password.</span>
          }
        </div>
        <button class="btn btn-primary auth-submit" type="submit" [disabled]="loading()">
          {{ loading() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
      <p class="auth-form-card__foot">New to the store? <a routerLink="/register">Create an account</a></p>
      <a class="auth-home-link" routerLink="/">Continue browsing</a>
    </div>
  `,
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

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CartApiService } from '../../core/services/cart-api.service';
import { CartStateService } from '../../core/services/cart-state.service';
import { parseApiFailure } from '../../core/services/api-error.service';

const matchingPasswords: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  control.get('password')?.value === control.get('confirmPassword')?.value ? null : { passwordMismatch: true };
const securePassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;

@Component({
  selector: 'tcs-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-form-card auth-form-card--wide">
      <p class="eyebrow">A wardrobe that feels like you</p>
      <h1 class="auth-form-card__title">Create account.</h1>
      <p class="auth-form-card__intro">Save your details and keep your orders close.</p>
      @if (error()) { <p class="notice notice-error" role="alert">{{ error() }}</p> }
      @if (cartNotice()) { <p class="notice" role="status">{{ cartNotice() }}</p> }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="auth-form-grid">
          <div class="field">
            <label for="register-first">First name</label>
            <input id="register-first" class="control" formControlName="firstName" autocomplete="given-name">
            @if (form.controls.firstName.touched && form.controls.firstName.invalid) { <span class="field-error">Enter your first name.</span> }
          </div>
          <div class="field">
            <label for="register-last">Last name</label>
            <input id="register-last" class="control" formControlName="lastName" autocomplete="family-name">
            @if (form.controls.lastName.touched && form.controls.lastName.invalid) { <span class="field-error">Enter your last name.</span> }
          </div>
        </div>
        <div class="field">
          <label for="register-email">Email address</label>
          <input id="register-email" class="control" type="email" formControlName="email" autocomplete="email">
          @if (form.controls.email.touched && form.controls.email.invalid) { <span class="field-error">Enter a valid email address.</span> }
        </div>
        <div class="field">
          <label for="register-phone">Phone <span class="field-optional">Optional</span></label>
          <input id="register-phone" class="control" type="tel" formControlName="phone" autocomplete="tel">
        </div>
        <div class="field">
          <label for="register-password">Password</label>
          <div class="password-control">
            <input
              id="register-password"
              class="control"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="new-password">
            <button type="button" (click)="togglePassword()">{{ showPassword() ? 'Hide' : 'Show' }}</button>
          </div>
          <small class="field-hint">10+ characters with upper- and lowercase, a number, and a symbol.</small>
          @if (form.controls.password.touched && form.controls.password.invalid) { <span class="field-error">Use a password that meets the requirements.</span> }
        </div>
        <div class="field">
          <label for="register-confirm">Confirm password</label>
          <input id="register-confirm" class="control" [type]="showPassword() ? 'text' : 'password'" formControlName="confirmPassword" autocomplete="new-password">
          @if (form.controls.confirmPassword.touched && (form.controls.confirmPassword.invalid || form.hasError('passwordMismatch'))) {
            <span class="field-error">Passwords must match.</span>
          }
        </div>
        <button class="btn btn-primary auth-submit" type="submit" [disabled]="loading()">
          {{ loading() ? 'Creating account…' : 'Create account' }}
        </button>
      </form>
      <p class="auth-form-card__foot">Already have an account? <a routerLink="/login">Sign in</a></p>
    </div>
  `,
  styleUrl: './authentication-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent {
  readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(256)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(securePassword)] }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  }, { validators: [matchingPasswords] });
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
    const value = this.form.getRawValue();
    this.loading.set(true);
    this.auth.register({
      email: value.email.trim(),
      password: value.password,
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      phone: value.phone.trim() || null,
    }).pipe(
      switchMap(() => this.carts.mergeGuestCart().pipe(
        catchError((failure: unknown) => {
          this.cartNotice.set(`Account created. Your guest bag could not be merged: ${parseApiFailure(failure).message}`);
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
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/');
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'We could not create the account.').message);
        this.loading.set(false);
      },
    });
  }
}

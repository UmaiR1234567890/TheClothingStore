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
  templateUrl: './register-page.component.html',
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

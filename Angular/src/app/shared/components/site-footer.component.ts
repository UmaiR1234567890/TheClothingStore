import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NewsletterApiService } from '../../core/services/newsletter-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-site-footer',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <footer class="footer">
      <div class="footer__newsletter">
        <div class="footer__newsletter-copy">
          <p class="eyebrow">Notes from the studio</p>
          <h2>A little more considered.</h2>
          <p>New arrivals, collection notes, and stories from The Clothing Store.</p>
        </div>
        <form class="footer__form" [formGroup]="form" (ngSubmit)="subscribe()">
          <label class="sr-only" for="newsletter-email">Email address</label>
          <div class="footer__field">
            <input
              id="newsletter-email"
              type="email"
              formControlName="email"
              autocomplete="email"
              placeholder="Your email address"
              [attr.aria-invalid]="form.controls.email.invalid && form.controls.email.touched">
            <button class="btn btn-accent" type="submit" [disabled]="form.invalid || loading">
              {{ loading ? 'Joining…' : 'Join us' }}
            </button>
          </div>
          @if (form.controls.email.invalid && form.controls.email.touched) {
            <span class="footer__message footer__message--error">Enter a valid email address.</span>
          }
          @if (message) {
            <span class="footer__message" role="status">{{ message }}</span>
          }
          @if (error) {
            <span class="footer__message footer__message--error" role="alert">{{ error }}</span>
          }
        </form>
      </div>

      <div class="footer__main container">
        <div class="footer__brand">
          <a class="footer__wordmark" routerLink="/">THE CLOTHING STORE</a>
          <p>Thoughtful everyday dressing, made to move with you.</p>
        </div>
        <div class="footer__links">
          <div>
            <h3>Explore</h3>
            <a routerLink="/men">Men</a>
            <a routerLink="/women">Women</a>
            <a routerLink="/kids">Kids</a>
          </div>
          <div>
            <h3>Help</h3>
            <a routerLink="/about">About us</a>
            <a routerLink="/contact">Contact</a>
            <a routerLink="/shipping">Delivery information</a>
            <a routerLink="/returns">Returns & exchanges</a>
          </div>
          <div>
            <h3>Account</h3>
            <a routerLink="/account/orders">Order history</a>
            <a routerLink="/account/addresses">Saved addresses</a>
            <a routerLink="/privacy">Privacy</a>
          </div>
        </div>
      </div>
      <div class="footer__bottom container">
        <span>© {{ currentYear }} The Clothing Store</span>
        <span>Made for the days that become stories.</span>
      </div>
    </footer>
  `,
  styleUrl: './site-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooterComponent {
  readonly currentYear = new Date().getFullYear();
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(256)] }),
  });
  loading = false;
  message = '';
  error = '';

  constructor(private readonly newsletter: NewsletterApiService) {}

  subscribe(): void {
    this.message = '';
    this.error = '';
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading) {
      return;
    }
    this.loading = true;
    this.newsletter.subscribe({ email: this.form.controls.email.value.trim() }).subscribe({
      next: (result) => {
        this.message = result.status === 'Subscribed'
          ? 'Subscription saved. Email confirmation is not configured.'
          : 'Subscription status updated.';
        this.form.reset();
        this.loading = false;
      },
      error: (failure: unknown) => {
        this.error = parseApiFailure(failure, 'We could not save your subscription. Try again shortly.').message;
        this.loading = false;
      },
    });
  }
}

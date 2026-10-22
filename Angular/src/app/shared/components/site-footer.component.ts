import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NewsletterApiService } from '../../core/services/newsletter-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-site-footer',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './site-footer.component.html',
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

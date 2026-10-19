import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageTitleService } from '../../core/services/page-title.service';

interface InformationContent {
  eyebrow: string;
  title: string;
  text: string;
}

const pages: Record<string, InformationContent> = {
  about: {
    eyebrow: 'Our point of view',
    title: 'Clothing for the life you live.',
    text: 'The Clothing Store is building a considered edit for everyday dressing. Brand history and company details will be added when approved store information is supplied.',
  },
  contact: {
    eyebrow: 'We are here to help',
    title: 'Contact the store.',
    text: 'Customer-service hours and contact details have not been configured yet. Please check back when the store team publishes its support information.',
  },
  shipping: {
    eyebrow: 'Delivery information',
    title: 'Shipping details.',
    text: 'Delivery regions, charges, and timing have not been supplied. The current API records zero shipping and tax; this is a technical default, not a published delivery promise.',
  },
  returns: {
    eyebrow: 'Returns & exchanges',
    title: 'A policy to be confirmed.',
    text: 'Return eligibility, timelines, and refund terms require approved store policy text. No return or refund commitment is represented here.',
  },
  privacy: {
    eyebrow: 'Privacy',
    title: 'Privacy information.',
    text: 'This placeholder needs an approved privacy notice describing the store’s data practices before production launch.',
  },
  terms: {
    eyebrow: 'Terms of service',
    title: 'Terms to be supplied.',
    text: 'This placeholder needs approved terms of service before production launch. It does not create or imply legal terms.',
  },
  faq: {
    eyebrow: 'Frequently asked questions',
    title: 'Answers are on the way.',
    text: 'Store policies and customer-service details have not yet been provided. This page will be updated with verified answers.',
  },
};

@Component({
  selector: 'tcs-information-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="information-page container">
      <p class="eyebrow">{{ content().eyebrow }}</p>
      <h1 class="page-title">{{ content().title }}</h1>
      <p class="page-intro">{{ content().text }}</p>
      <a class="text-link" routerLink="/">Return to the collection <span aria-hidden="true">→</span></a>
    </section>
  `,
  styles: [`
    .information-page { display:flex; min-height:48vh; flex-direction:column; align-items:flex-start; justify-content:center; gap:1rem; padding-block:4rem; }
    .information-page .page-title { max-width:850px; }
    .information-page .page-intro { max-width:650px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformationPageComponent implements OnInit {
  readonly content = signal<InformationContent>(pages['about']);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly pageTitles: PageTitleService,
  ) {}

  ngOnInit(): void {
    const page = this.route.snapshot.data['page'];
    const content = typeof page === 'string' && pages[page] ? pages[page] : pages['about'];
    this.content.set(content);
    this.pageTitles.set(content.title, content.text);
  }
}

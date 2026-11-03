import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageTitleService } from '../../core/services/page-title.service';

interface InformationContent {
  eyebrow: string;
  title: string;
  text: string;
  points?: string[];
  links?: { label: string; href: string; icon?: 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'gmail' }[];
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
    text: 'The Clothing Store brings considered, everyday pieces to your wardrobe — thoughtful fabrics, honest pricing, and styles made to move with you. Reach out any time; we reply on our socials and WhatsApp.',
    links: [
      { label: 'WhatsApp', href: 'https://wa.me/923320943117', icon: 'whatsapp' },
      { label: 'Facebook', href: 'https://www.facebook.com/share/1CD6zPPMQC/', icon: 'facebook' },
      { label: 'Instagram', href: 'https://www.instagram.com/nexovatemarketing', icon: 'instagram' },
      { label: 'TikTok', href: 'https://www.tiktok.com/@nexovate.marketing', icon: 'tiktok' },
      { label: 'Gmail', href: 'https://mail.google.com/mail/?view=cm&to=nexovatemarketing@gmail.com', icon: 'gmail' },
    ],
  },
  shipping: {
    eyebrow: 'Delivery information',
    title: 'Shipping details.',
    text: 'Delivery regions, charges, and timing have not been supplied. The current API records zero shipping and tax; this is a technical default, not a published delivery promise.',
  },
  returns: {
    eyebrow: 'Returns & exchanges',
    title: 'Our returns policy.',
    text: 'We want every piece to feel right. Here is how returns and exchanges work at The Clothing Store:',
    points: [
      '7-day return window — items can be returned within 7 days of delivery.',
      'Exchange within 7 days — swap for a different size or color of the same item, subject to stock.',
      'Items must be unworn, unwashed, and in original condition with all tags attached.',
      'Original packaging and the invoice/order number are required for any return or exchange.',
      'Fragrances and personal-care items are non-returnable once opened, for hygiene reasons.',
      'Sale and discounted items are exchange-only unless marked otherwise.',
      'Refunds are issued to the original payment method within 5-7 business days after inspection.',
      'Defective or incorrect items are replaced or refunded in full — contact us with photos within 48 hours.',
      'Return shipping is borne by the customer unless the item is defective or incorrectly shipped.',
      'Start a return via Track order on any order page, or contact us through the Contact page.',
    ],
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
  templateUrl: './information-page.component.html',
  styles: [`
    .information-page { display:flex; min-height:48vh; flex-direction:column; align-items:flex-start; justify-content:center; gap:1rem; padding-block:4rem; }
    .information-page .page-title { max-width:850px; }
    .information-page .page-intro { max-width:650px; }
    .info-points { max-width:680px; margin:0; padding-left:1.3rem; line-height:1.7; }
    .info-points li { margin-bottom:0.4rem; }
    .info-links { display:flex; flex-wrap:wrap; gap:10px; margin-top:0.5rem; }
    .info-links a { display:inline-flex; width:50px; height:50px; align-items:center; justify-content:center; border-radius:50%; color:#fff; text-decoration:none; transition:transform 0.15s,box-shadow 0.15s; box-shadow:0 2px 8px rgba(0,0,0,.16); }
    .info-links a:hover { transform:translateY(-2px); box-shadow:0 5px 16px rgba(0,0,0,.24); }
    .info-links a svg { width:22px; height:22px; fill:#fff; }
    .info-links a.whatsapp { background:#25d366; }
    .info-links a.facebook { background:#1877f2; }
    .info-links a.instagram { background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888); }
    .info-links a.tiktok { background:#010101; }
    .info-links a.gmail { background:#ea4335; }
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

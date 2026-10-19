import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

const routeTitles: Record<string, string> = {
  '': 'Modern Pakistani Fashion',
  men: 'Menswear',
  women: 'Womenswear',
  kids: 'Kidswear',
  category: 'Collection',
  search: 'Search',
  products: 'Product',
  cart: 'Your Bag',
  checkout: 'Checkout',
  login: 'Sign In',
  register: 'Create Account',
  'forgot-password': 'Account Recovery',
  'reset-password': 'Reset Password',
  account: 'Your Account',
  admin: 'Store Administration',
  about: 'About',
  contact: 'Contact',
  shipping: 'Delivery Information',
  returns: 'Returns & Exchanges',
  privacy: 'Privacy',
  terms: 'Terms',
  faq: 'FAQs',
  unauthorized: 'Access Restricted',
};

@Injectable({ providedIn: 'root' })
export class PageTitleService {
  constructor(
    private readonly router: Router,
    private readonly title: Title,
    private readonly meta: Meta,
  ) {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.updateForPath(this.router.url);
    });
  }

  set(title: string, description: string): void {
    const fullTitle = `${title} | The Clothing Store`;
    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
  }

  private updateForPath(url: string): void {
    const path = url.split(/[?#]/, 1)[0] ?? '';
    const firstSegment = path.split('/').filter(Boolean)[0] ?? '';
    const name = routeTitles[firstSegment] ?? 'The Clothing Store';
    this.set(name, `${name} from The Clothing Store. Explore thoughtfully curated pieces for men, women, and kids.`);
  }
}

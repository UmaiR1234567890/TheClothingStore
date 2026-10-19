import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'tcs-unauthorized-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="utility-page container">
      <p class="eyebrow">Access / Restricted</p>
      <h1 class="page-title">This area is<br>for the store team.</h1>
      <p class="page-intro">Your current account does not have permission to view this page.</p>
      <a class="btn btn-primary" routerLink="/">Back to the storefront</a>
    </section>
  `,
  styles: [`
    .utility-page { min-height:54vh; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:1rem; padding-block:4rem; }
    .utility-page .page-title { font-size:clamp(3rem,8vw,6rem); }
    .utility-page .page-intro { margin-bottom:1rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnauthorizedPageComponent {}

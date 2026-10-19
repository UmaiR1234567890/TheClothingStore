import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'tcs-not-found-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="utility-page container">
      <p class="eyebrow">404 / Not found</p>
      <h1 class="page-title">This page took<br>a different turn.</h1>
      <p class="page-intro">The address may be out of date, or the page may have moved.</p>
      <a class="btn btn-primary" routerLink="/">Return to the collection</a>
    </section>
  `,
  styles: [`
    .utility-page { min-height:54vh; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:1rem; padding-block:4rem; }
    .utility-page .page-title { font-size:clamp(3rem,8vw,6rem); }
    .utility-page .page-intro { margin-bottom:1rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPageComponent {}

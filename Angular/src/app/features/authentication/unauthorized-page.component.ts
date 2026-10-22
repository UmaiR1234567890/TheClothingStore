import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'tcs-unauthorized-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './unauthorized-page.component.html',
  styles: [`
    .utility-page { min-height:54vh; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:1rem; padding-block:4rem; }
    .utility-page .page-title { font-size:clamp(3rem,8vw,6rem); }
    .utility-page .page-intro { margin-bottom:1rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnauthorizedPageComponent {}

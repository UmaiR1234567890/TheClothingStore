import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'tcs-auth-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './auth-layout.component.html',
  styles: [`
    .auth-shell { display:grid; min-height:100vh; grid-template-columns:minmax(320px, .9fr) minmax(360px, 1.1fr); background:var(--surface); }
    .auth-editorial { position:relative; display:flex; min-height:100vh; flex-direction:column; justify-content:space-between; overflow:hidden; padding:clamp(2rem,5vw,5rem); color:#f8f5ed; background:radial-gradient(circle at 75% 28%, rgb(196 143 115 / 40%), transparent 26%), linear-gradient(150deg,#4d5146,#777365 52%,#a37a63); }
    .auth-editorial::after { position:absolute; right:-12%; bottom:-25%; width:min(62vw,580px); aspect-ratio:1; border:1px solid rgb(255 255 255 / 25%); border-radius:50%; content:""; box-shadow:0 0 0 40px rgb(255 255 255 / 5%),0 0 0 90px rgb(255 255 255 / 4%); }
    .auth-wordmark { z-index:1; display:grid; width:fit-content; justify-items:center; color:inherit; line-height:1; }
    .auth-wordmark__small { font-size:.57rem; font-weight:750; letter-spacing:.32em; }
    .auth-wordmark__main { margin-top:.3rem; font-family:"Bodoni MT",Didot,Georgia,serif; font-size:1.45rem; letter-spacing:.04em; }
    .auth-editorial__copy { z-index:1; max-width:500px; }
    .auth-editorial__copy .eyebrow { color:#f0c8ae; }
    .auth-editorial__copy h1 { margin:.8rem 0 1rem; font-family:"Bodoni MT",Didot,Georgia,serif; font-size:clamp(3.5rem,7vw,7rem); font-weight:500; letter-spacing:-.055em; line-height:.86; }
    .auth-editorial__copy p:last-child { max-width:350px; color:#e3e0d6; font-size:1rem; line-height:1.65; }
    .auth-editorial__seal { z-index:1; align-self:flex-end; font-size:.65rem; letter-spacing:.2em; }
    .auth-panel { display:grid; place-items:center; padding:2rem; }
    @media (max-width:760px) { .auth-shell { grid-template-columns:1fr; } .auth-editorial { min-height:34vh; padding:1.5rem; } .auth-editorial__copy { margin-top:3rem; } .auth-editorial__copy h1 { font-size:3.3rem; } .auth-editorial__seal { display:none; } .auth-panel { padding:2rem 1.25rem 3rem; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {}

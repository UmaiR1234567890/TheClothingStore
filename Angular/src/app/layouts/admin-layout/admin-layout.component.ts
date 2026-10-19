import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'tcs-admin-layout',
  standalone: true,
  imports: [AsyncPipe, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-shell">
      <aside class="admin-sidebar" [class.admin-sidebar--open]="menuOpen()">
        <a class="admin-brand" routerLink="/admin">
          <span>THE CLOTHING STORE</span>
          <small>BACK OFFICE</small>
        </a>
        <nav aria-label="Administration">
          <a routerLink="/admin" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="is-active">
            <span>01</span> Overview
          </a>
          <a routerLink="/admin/products" routerLinkActive="is-active"><span>02</span> Products</a>
          <a routerLink="/admin/categories" routerLinkActive="is-active"><span>03</span> Categories</a>
          <a routerLink="/admin/attributes" routerLinkActive="is-active"><span>04</span> Attributes</a>
          <a routerLink="/admin/sales" routerLinkActive="is-active"><span>05</span> Promotions</a>
          <a routerLink="/admin/inventory" routerLinkActive="is-active"><span>06</span> Inventory</a>
          <a routerLink="/admin/orders" routerLinkActive="is-active"><span>07</span> Orders</a>
          <a routerLink="/admin/shipments" routerLinkActive="is-active"><span>08</span> Shipments</a>
          <a routerLink="/admin/payments" routerLinkActive="is-active"><span>09</span> Payments</a>
          <a routerLink="/admin/customers" routerLinkActive="is-active"><span>10</span> Customers</a>
        </nav>
        <a class="admin-sidebar__store" routerLink="/">← Return to storefront</a>
      </aside>
      <div class="admin-main">
        <header class="admin-topbar">
          <button class="admin-menu-toggle" type="button" (click)="toggleMenu()" aria-label="Toggle admin navigation">
            <span></span><span></span><span></span>
          </button>
          <div>
            <span class="admin-topbar__eyebrow">The Clothing Store</span>
            <strong>Administration</strong>
          </div>
          @if (auth.user$ | async; as user) {
            <span class="admin-topbar__user">{{ user.email }}</span>
          }
          <button class="admin-topbar__logout" type="button" (click)="signOut()">Sign out</button>
        </header>
        <main class="admin-content">
          <router-outlet />
        </main>
      </div>
      @if (menuOpen()) {
        <button class="admin-scrim" type="button" aria-label="Close navigation" (click)="menuOpen.set(false)"></button>
      }
    </div>
  `,
  styles: [`
    .admin-shell { min-height:100vh; color:var(--ink); background:#eef0ec; }
    .admin-sidebar { position:fixed; z-index:50; inset:0 auto 0 0; display:flex; width:248px; flex-direction:column; padding:1.4rem 1rem; color:#e9e9e2; background:#202420; }
    .admin-brand { display:grid; gap:.3rem; padding:.6rem .65rem 1.6rem; font-family:"Bodoni MT",Didot,Georgia,serif; font-size:1.05rem; letter-spacing:.06em; }
    .admin-brand small { color:#b8beaf; font-family:"Avenir Next",Avenir,"Segoe UI",sans-serif; font-size:.57rem; letter-spacing:.19em; }
    .admin-sidebar nav { display:grid; gap:.22rem; }
    .admin-sidebar nav a { display:flex; min-height:42px; align-items:center; gap:.8rem; border-radius:4px; padding:.6rem .7rem; color:#d4d7cf; font-size:.82rem; }
    .admin-sidebar nav a span { color:#9ca393; font-size:.64rem; letter-spacing:.08em; }
    .admin-sidebar nav a:hover,.admin-sidebar nav a.is-active { color:white; background:#343b32; }
    .admin-sidebar nav a.is-active span { color:#e7aa8f; }
    .admin-sidebar__store { margin-top:auto; border-top:1px solid #41473e; padding:1rem .7rem .2rem; color:#d4d7cf; font-size:.78rem; }
    .admin-main { min-height:100vh; margin-left:248px; }
    .admin-topbar { position:sticky; z-index:10; top:0; display:flex; min-height:76px; align-items:center; gap:1rem; border-bottom:1px solid #daddd7; padding:.8rem clamp(1rem,3vw,2.8rem); background:rgb(255 255 252 / 94%); backdrop-filter:blur(12px); }
    .admin-topbar div { display:grid; gap:.2rem; }
    .admin-topbar__eyebrow { color:var(--muted); font-size:.6rem; letter-spacing:.14em; text-transform:uppercase; }
    .admin-topbar strong { font-family:"Bodoni MT",Didot,Georgia,serif; font-size:1.2rem; font-weight:500; }
    .admin-topbar__user { margin-left:auto; color:var(--muted); font-size:.78rem; }
    .admin-topbar__logout { border:0; border-bottom:1px solid currentColor; padding:.3rem 0; color:var(--ink); background:transparent; cursor:pointer; font-size:.72rem; }
    .admin-content { padding:clamp(1.2rem,3vw,2.8rem); }
    .admin-menu-toggle,.admin-scrim { display:none; }
    @media (max-width:850px) { .admin-sidebar { transform:translateX(-100%); transition:transform 180ms ease; } .admin-sidebar--open { transform:translateX(0); } .admin-main { margin-left:0; } .admin-menu-toggle { display:grid; width:36px; gap:5px; border:0; padding:.45rem; background:transparent; } .admin-menu-toggle span { height:1px; background:var(--ink); } .admin-scrim { position:fixed; z-index:40; inset:0; display:block; border:0; background:rgb(0 0 0 / 30%); } }
    @media (max-width:520px) { .admin-topbar__user { display:none; } .admin-topbar__logout { margin-left:auto; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  readonly menuOpen = signal(false);

  constructor(
    readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  signOut(): void {
    this.auth.logout().subscribe(() => void this.router.navigate(['/']));
  }
}

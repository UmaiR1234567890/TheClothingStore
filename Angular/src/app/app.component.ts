import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { LoadingService } from './core/services/loading.service';
import { PageTitleService } from './core/services/page-title.service';

@Component({
  selector: 'tcs-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  constructor(
    private readonly auth: AuthService,
    private readonly pageTitle: PageTitleService,
    readonly loading: LoadingService,
  ) {}

  ngOnInit(): void {
    this.auth.restoreSession().subscribe();
  }
}

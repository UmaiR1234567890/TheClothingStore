import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
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
  ) {}

  ngOnInit(): void {
    this.auth.restoreSession().subscribe();
  }
}

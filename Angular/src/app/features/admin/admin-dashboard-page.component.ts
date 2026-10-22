import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardSummaryDto } from '../../core/models/admin.models';
import { AdminApiService } from '../../core/services/admin-api.service';
import { parseApiFailure } from '../../core/services/api-error.service';

@Component({
  selector: 'tcs-admin-dashboard-page',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './admin-dashboard-page.component.html',
  styleUrl: './admin-pages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPageComponent implements OnInit {
  readonly summary = signal<DashboardSummaryDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor(private readonly admin: AdminApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin.getDashboardSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: (failure: unknown) => {
        this.error.set(parseApiFailure(failure, 'Dashboard data could not be loaded.').message);
        this.loading.set(false);
      },
    });
  }
}

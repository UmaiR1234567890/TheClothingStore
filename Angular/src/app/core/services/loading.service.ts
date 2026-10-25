import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pending = signal(0);

  active(): boolean {
    return this.pending() > 0;
  }

  begin(): void {
    this.pending.update((count) => count + 1);
  }

  end(): void {
    this.pending.update((count) => Math.max(0, count - 1));
  }
}

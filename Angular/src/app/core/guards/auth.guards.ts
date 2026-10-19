import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AuthTokenStore } from '../auth/auth-token.store';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const tokens = inject(AuthTokenStore);
  const router = inject(Router);

  if (!tokens.token) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  if (auth.userSnapshot) {
    return true;
  }
  return auth.loadCurrentUser().pipe(
    map(() => true),
    catchError(() => {
      auth.clearLocalSession();
      return of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }));
    }),
  );
};

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const tokens = inject(AuthTokenStore);
  const router = inject(Router);

  if (!tokens.token) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  const checkUser = auth.userSnapshot ? of(auth.userSnapshot) : auth.loadCurrentUser();
  return checkUser.pipe(
    map((user) => user.roles.includes('Admin') ? true : router.createUrlTree(['/unauthorized'])),
    catchError(() => {
      auth.clearLocalSession();
      return of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }));
    }),
  );
};

export const guestOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const tokens = inject(AuthTokenStore);
  const router = inject(Router);

  if (!tokens.token) {
    return true;
  }
  const checkUser = auth.userSnapshot ? of(auth.userSnapshot) : auth.loadCurrentUser();
  return checkUser.pipe(
    map(() => router.createUrlTree(['/account/profile'])),
    catchError(() => {
      auth.clearLocalSession();
      return of(true);
    }),
  );
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn) return true;
  // Нет токена и человек намеренно пытается открыть защищённый route
  // напрямую по ссылке (а не получил 401 во время сессии — это
  // обрабатывает authInterceptor через auth.logout() → /login).
  return router.createUrlTree(['/error/no-access']);
};

import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './services/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    // provideAnimations() removed: login/register now use plain Tailwind
    // animate-* classes (see tailwind.config.js keyframes) instead of
    // @angular/animations triggers, so the animations package is no
    // longer required by these components. Keep this removed only if no
    // other part of the app still relies on BrowserAnimationsModule /
    // @Component({ animations: [...] }) triggers — grep for "trigger(" or
    // "animations:" elsewhere before deleting the import for good.
  ],
};

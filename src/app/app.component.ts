import { Component } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthBackgroundComponent } from './shared/auth-background/auth-background.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, AuthBackgroundComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  /** true when the current route is /login or /register */
  readonly isAuthRoute$;

  constructor(private router: Router) {
    this.isAuthRoute$ = this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        const url = this.router.url;
        return url.startsWith('/login') || url.startsWith('/register');
      }),
    );
  }
}

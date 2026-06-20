import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, map, startWith } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { AuthBackgroundComponent } from './shared/auth-background/auth-background.component';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, AuthBackgroundComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
  /** true when the current route is /login or /register */
  readonly isAuthRoute$;
  private settingsSub?: Subscription;
  private liveSub?: Subscription;

  constructor(
    private router: Router,
    private title: Title,
    private settings: SettingsService,
  ) {
    this.isAuthRoute$ = this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        const url = this.router.url;
        return (
          url.startsWith('/login') ||
          url.startsWith('/register') ||
          url.startsWith('/error/no-access')
        );
      }),
    );

    this.applyTitleFromCache();
  }

  ngOnInit(): void {
    this.settingsSub = this.settings.get().subscribe({
      next: (settings) => this.applyTitle(settings['camp_name'] as string),
      error: () => {},
    });

    this.liveSub = this.settings.live$.subscribe((settings) => {
      if ('camp_name' in settings) {
        this.applyTitle(settings['camp_name'] as string);
      }
    });
  }

  ngOnDestroy(): void {
    this.settingsSub?.unsubscribe();
    this.liveSub?.unsubscribe();
  }

  private applyTitle(name?: string): void {
    const safeName = (name ?? '').trim();
    this.title.setTitle(safeName ? safeName : 'CampFrontend');
  }

  private applyTitleFromCache(): void {
    const cached = this.settings.peekCache();
    this.applyTitle(cached?.['camp_name'] as string | undefined);
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  Router,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
} from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SettingsService, CampSettings } from '../../services/settings.service';
import { ThemeService } from '../../services/theme.service';
import { NewsStatusService } from '../../services/news-status.service';
import { PushService } from '../../services/push.service';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';
import { IconComponent } from '../../shared/icon.component';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MediaUrlPipe,
    IconComponent,
    LoadingSpinnerComponent,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent implements OnInit, OnDestroy {
  campName = '';
  campOrganization = '';
  campEmoji = '';
  campLogoPath: string | null = null;
  campColor = '#F59E0B';
  campDateStart = '';
  campDateEnd = '';

  mobileMenuOpen = false;

  /** true между NavigationStart и завершением навигации — показывает спиннер вместо router-outlet */
  routeLoading = false;

  /** Непрочитанные новости — бейджик рядом с пунктом «Новости» в меню */
  unreadNewsCount = 0;

  // ─── Баннер «включите push-уведомления» ──────────────────────────────────
  // Показывается при каждом заходе, пока пользователь не подпишется —
  // уведомления обязательны для лагеря (важные объявления, старт событий и т.д.)
  showPushBanner = false;
  pushLoading = false;
  pushError = '';
  /** true — браузер в принципе не поддерживает push (не iOS, а просто старый/несовместимый) */
  pushUnsupported = false;
  /** true — iPhone/Safari, но сайт открыт обычной вкладкой, а не с экрана «Домой» */
  pushNeedsIosInstall = false;

  private liveSub?: Subscription;
  private routerEventsSub?: Subscription;
  private newsStatusSub?: Subscription;

  constructor(
    public auth: AuthService,
    public themeService: ThemeService,
    private settingsService: SettingsService,
    private router: Router,
    private newsStatus: NewsStatusService,
    private push: PushService,
  ) {}

  ngOnInit() {
    this.checkPushStatus();

    this.newsStatusSub = this.newsStatus.unreadCount$.subscribe(
      (c) => (this.unreadNewsCount = c),
    );

    // Первичная загрузка: memory → localStorage → HTTP
    this.settingsService.get().subscribe({
      next: (d) => this.applySettings(d),
      error: () => {},
    });

    // Живые обновления — срабатывает при каждом patch() из любого компонента.
    // BehaviorSubject стартует с {} — пропускаем пустой начальный эмит.
    this.liveSub = this.settingsService.live$.subscribe((d) => {
      if (Object.keys(d).length > 0) {
        this.applySettings(d as CampSettings);
      }
    });

    // Спиннер на время навигации между страницами (особенно полезно
    // для lazy-loaded chunks через loadComponent).
    //
    // Важно: NavigationStart для самой первой навигации приложения может
    // сработать синхронно — ещё до того, как Angular закончил первую
    // проверку изменений этого компонента. Если менять routeLoading прямо
    // здесь, в dev-режиме это ловится как
    // ExpressionChangedAfterItHasBeenCheckedError (NG0100). Откладываем
    // изменение на следующий микротаск — оно попадёт уже в новый цикл CD.
    this.routerEventsSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        Promise.resolve().then(() => (this.routeLoading = true));
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        Promise.resolve().then(() => {
          this.routeLoading = false;
          this.auth.refreshMyHouseAccess();
        });
      }
    });
  }

  ngOnDestroy() {
    this.liveSub?.unsubscribe();
    this.routerEventsSub?.unsubscribe();
    this.newsStatusSub?.unsubscribe();
  }

  private applySettings(d: Partial<CampSettings>): void {
    if (d['camp_name'] != null) this.campName = d['camp_name'] as string;
    if (d['camp_organization'] != null)
      this.campOrganization = d['camp_organization'] as string;
    if (d['camp_emoji'] != null) this.campEmoji = d['camp_emoji'] as string;
    if (d['camp_logo_path'] != null)
      this.campLogoPath = d['camp_logo_path'] as string | null;
    if (d['camp_color'] != null) this.campColor = d['camp_color'] as string;
    const start = d['camp_date_start'] as string | undefined;
    const end = d['camp_date_end'] as string | undefined;
    if (start !== undefined)
      this.campDateStart = start ? start.slice(0, 10) : '';
    if (end !== undefined) this.campDateEnd = end ? end.slice(0, 10) : '';
  }

  getUserInitials(): string {
    const name =
      this.auth.currentUser()?.fullName ||
      this.auth.currentUser()?.full_name ||
      '';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  toggleTheme() {
    const next = this.themeService.current === 'dark' ? 'light' : 'dark';
    this.themeService.setTheme(next, this.auth.token);
  }

  // ─── Баннер «включите push-уведомления» ──────────────────────────────────

  private async checkPushStatus(): Promise<void> {
    if (!this.push.isSupported()) {
      this.pushNeedsIosInstall = this.isIosSafariNotInstalled();
      this.pushUnsupported = !this.pushNeedsIosInstall;
      // На обычном (не iOS) неподдерживаемом браузере показывать баннер
      // смысла нет — включить всё равно нечем.
      this.showPushBanner = this.pushNeedsIosInstall;
      return;
    }

    const subscription = await this.push.getExistingSubscription();
    this.showPushBanner = !subscription;
  }

  /** iPhone/iPad в обычной вкладке Safari (не установлено на экран «Домой») —
   *  единственный случай неподдержки, который пользователь может исправить сам. */
  private isIosSafariNotInstalled(): boolean {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      (navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    return isIos && !isStandalone;
  }

  async onEnablePush(): Promise<void> {
    if (this.pushLoading) return;
    this.pushLoading = true;
    this.pushError = '';
    try {
      await this.push.subscribeUser();
      this.showPushBanner = false;
    } catch (err: any) {
      this.pushError = err?.message || 'Не удалось включить уведомления';
    } finally {
      this.pushLoading = false;
    }
  }

  /** Скрывает баннер до следующего захода на сайт (не навсегда — уведомления обязательны). */
  dismissPushBanner(): void {
    this.showPushBanner = false;
  }

  get isDark(): boolean {
    return this.themeService.current === 'dark';
  }

  /** Участник получает упрощённую навигацию — нижнюю панель вкладок вместо бокового меню персонала. */
  get isParticipant(): boolean {
    return this.auth.role === 'participant';
  }
}

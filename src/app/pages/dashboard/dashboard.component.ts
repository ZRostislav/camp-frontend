import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  CommonModule,
  DatePipe,
  DecimalPipe,
  SlicePipe,
} from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { NewsStatusService } from '../../services/news-status.service';
import { IconComponent } from '../../shared/icon.component';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IconComponent,
    DatePipe,
    DecimalPipe,
    SlicePipe,
    MediaUrlPipe,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  houses: any[] = [];
  news: any[] = [];
  schedule: any[] = [];
  contests: any[] = [];
  loading = true;

  campName = '';
  campColor = '#F59E0B';

  today = new Date();
  medals = ['🥇', '🥈', '🥉'];

  /** Непрочитанные новости — для бейджа/анимации на карточке «Новости» */
  unreadNewsCount = 0;

  /** «Свежими» считаем события младше суток */
  private readonly NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

  private newsStatusSub?: Subscription;

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private settings: SettingsService,
    private newsStatus: NewsStatusService,
  ) {}

  ngOnInit() {
    this.settings.get().subscribe({
      next: (d) => {
        this.campName = (d['camp_name'] as string) ?? '';
        this.campColor = (d['camp_color'] as string) ?? '#F59E0B';
      },
      error: () => {},
    });

    this.api.get('/houses').subscribe({
      next: (d: any) => {
        this.houses = [...d].sort((a, b) => b.house_points - a.house_points);
      },
      error: () => {},
    });

    this.api.get('/news').subscribe({
      next: (d: any) => {
        this.news = d.slice(0, 3);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });

    this.api.get('/schedule').subscribe({
      next: (d: any) => (this.schedule = d),
      error: () => {},
    });

    this.api.get('/contests').subscribe({
      next: (d: any) => (this.contests = d),
      error: () => {},
    });

    // Актуализируем список новостей у сервиса и подписываемся на счётчик
    // непрочитанных — обновится реактивно, если новость появится прямо
    // во время просмотра главной.
    this.newsStatus.refresh();
    this.newsStatusSub = this.newsStatus.unreadCount$.subscribe(
      (c) => (this.unreadNewsCount = c),
    );
  }

  ngOnDestroy() {
    this.newsStatusSub?.unsubscribe();
  }

  isUnreadNews(n: any): boolean {
    return !n?.is_read;
  }

  /** «Новое» событие — создано меньше суток назад */
  isNewItem(item: any): boolean {
    if (!item?.created_at) return false;
    return (
      Date.now() - new Date(item.created_at).getTime() < this.NEW_WINDOW_MS
    );
  }

  get newEventsCount(): number {
    return this.contests.filter((c) => this.isNewItem(c)).length;
  }

  get hasNewEvents(): boolean {
    return this.newEventsCount > 0;
  }

  get campColorBg(): string {
    return this.hexToRgba(this.campColor, 0.1);
  }

  get campColorLight(): string {
    return this.hexToRgba(this.campColor, 0.15);
  }

  get totalParticipants(): number {
    return this.houses.reduce((sum, h) => sum + (h.participants_count ?? 0), 0);
  }

  get topHousePoints(): number {
    return this.houses.length ? this.houses[0].house_points : 0;
  }

  getHouseBarWidth(house: any): number {
    if (!this.topHousePoints) return 0;
    return Math.round((house.house_points / this.topHousePoints) * 100);
  }

  get activeScheduleIndex(): number {
    if (!this.schedule.length) return -1;
    const now = this.today.getHours() * 60 + this.today.getMinutes();
    let active = -1;
    for (let i = 0; i < this.schedule.length; i++) {
      const t = this.parseTime(this.schedule[i].time);
      if (t !== null && t <= now) active = i;
    }
    return active;
  }

  isActiveScheduleItem(index: number): boolean {
    return index === this.activeScheduleIndex;
  }

  private parseTime(timeStr: string): number | null {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
}

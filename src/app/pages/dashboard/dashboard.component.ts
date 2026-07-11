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

  /** Даты смены из camp_settings_cache (camp_date_start / camp_date_end). */
  campDateStart: Date | null = null;
  campDateEnd: Date | null = null;

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
        this.campDateStart = this.parseDate(d['camp_date_start'] as string);
        this.campDateEnd = this.parseDate(d['camp_date_end'] as string);
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

  /** Имя пользователя для приветствия: сначала firstName, потом fullName/full_name (первое слово), потом username. */
  get userFirstName(): string {
    const u = this.auth.currentUser();
    if (!u) return '';
    if (u.firstName) return u.firstName;
    const full = u.fullName ?? u.full_name;
    if (full) return full.trim().split(/\s+/)[0];
    return u.username ?? '';
  }

  /** "Доброе утро", "Добрый день", "Добрый вечер", "Доброй ночи" — в зависимости от текущего часа. */
  get timeOfDayGreeting(): string {
    const hour = this.today.getHours();
    if (hour >= 5 && hour < 12) return 'Доброе утро';
    if (hour >= 12 && hour < 18) return 'Добрый день';
    if (hour >= 18 && hour < 23) return 'Добрый вечер';
    return 'Доброй ночи';
  }

  /** Итоговый текст в заголовке: приветствие + имя, либо просто приветствие, если имени нет. */
  get greeting(): string {
    const name = this.userFirstName;
    return name
      ? `${this.timeOfDayGreeting}, ${name}!`
      : this.timeOfDayGreeting;
  }

  /** Число дней смены (включительно), null если даты не заданы. */
  get campTotalDays(): number | null {
    if (!this.campDateStart || !this.campDateEnd) return null;
    return this.daysBetween(this.campDateStart, this.campDateEnd) + 1;
  }

  /** Порядковый номер текущего дня смены (1-based), null если сегодня вне диапазона или даты не заданы. */
  get campDayNumber(): number | null {
    if (!this.campDateStart || !this.campDateEnd) return null;
    const todayStart = this.stripTime(this.today);
    if (todayStart < this.campDateStart || todayStart > this.campDateEnd)
      return null;
    return this.daysBetween(this.campDateStart, todayStart) + 1;
  }

  /** Сколько дней осталось до конца смены (включая сегодня), null если смена не идёт. */
  get campDaysLeft(): number | null {
    if (!this.campDateEnd) return null;
    const todayStart = this.stripTime(this.today);
    if (todayStart > this.campDateEnd) return null;
    const left = this.daysBetween(todayStart, this.campDateEnd);
    return Math.max(left, 0);
  }

  /** Сколько дней осталось до начала смены, если она ещё не началась. */
  get daysUntilCampStart(): number | null {
    if (!this.campDateStart) return null;
    const todayStart = this.stripTime(this.today);
    if (todayStart >= this.campDateStart) return null;
    return this.daysBetween(todayStart, this.campDateStart);
  }

  /** Текст для бейджа вместо названия лагеря: день смены и сколько осталось. */
  get campDayLabel(): string {
    if (!this.campDateStart || !this.campDateEnd) {
      return this.campName || 'Лагерь';
    }

    const todayStart = this.stripTime(this.today);

    if (todayStart > this.campDateEnd) {
      return 'Конец';
    }

    if (todayStart < this.campDateStart) {
      const until = this.daysUntilCampStart ?? 0;
      return `До начала: ${until} ${this.pluralizeDays(until)}`;
    }

    const day = this.campDayNumber;
    const total = this.campTotalDays;
    const left = this.campDaysLeft ?? 0;

    if (left === 0) {
      return `День ${day} из ${total} · последний день`;
    }
    return `День ${day} из ${total} · осталось ${left} ${this.pluralizeDays(left)}`;
  }

  /** Русское склонение слова "день" (1 день, 2 дня, 5 дней). */
  private pluralizeDays(n: number): string {
    const abs = Math.abs(n) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return 'дней';
    if (last === 1) return 'день';
    if (last >= 2 && last <= 4) return 'дня';
    return 'дней';
  }

  private stripTime(d: Date): Date {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private daysBetween(a: Date, b: Date): number {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    return Math.round(
      (this.stripTime(b).getTime() - this.stripTime(a).getTime()) / MS_PER_DAY,
    );
  }

  private parseDate(value: string | undefined | null): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';
import { IconComponent } from '../../shared/icon.component';

// "Мой домик" — страница для участника (его собственный домик) и
// вожатого/помощника (домик, закреплённый за ним через house_responsible).
// Данные приходят с бэкенда уже отфильтрованными по доступу к коду
// доступа (access_code): для counselor/helper — виден их домика,
// для participant — не виден никогда (см. src/utils/houseAccess.js).
@Component({
  selector: 'app-my-house',
  standalone: true,
  imports: [CommonModule, MediaUrlPipe, IconComponent],
  templateUrl: './my-house.component.html',
  styleUrl: './my-house.component.css',
})
export class MyHouseComponent implements OnInit {
  house: any = null;
  loading = true;
  error = '';

  campColor = '#F59E0B';

  private readonly roleLabels: Record<string, string> = {
    superadmin: 'Суперадмин',
    admin: 'Администратор',
    counselor: 'Вожатый',
    helper: 'Помощник',
    staff: 'Персонал',
  };

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private settings: SettingsService,
  ) {}

  ngOnInit() {
    this.settings.get().subscribe({
      next: (d) => {
        this.campColor = (d['camp_color'] as string) ?? '#F59E0B';
      },
      error: () => {},
    });
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.api.get('/houses/mine').subscribe({
      next: (d: any) => {
        this.house = d;
        this.loading = false;
      },
      error: (e) => {
        this.error = e.error?.error || 'Ошибка загрузки';
        this.house = null;
        this.loading = false;
      },
    });
  }

  get campColorBg(): string {
    return this.colorBg(this.campColor);
  }

  /** Цвет самого домика (если задан на бэкенде) — иначе общий campColor. */
  get houseColor(): string {
    return this.house?.color || this.campColor;
  }

  get houseColorBg(): string {
    return this.colorBg(this.houseColor);
  }

  private colorBg(hex: string, alpha = 0.1): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /** Заголовок-подсказка под H1 в зависимости от роли смотрящего. */
  get subtitle(): string {
    return this.auth.role === 'participant'
      ? 'Ваш домик и соседи по нему'
      : 'Домик, закреплённый за вами';
  }

  /** Текст для пустого состояния (домик не назначен). */
  get emptyMessage(): string {
    return this.auth.role === 'participant'
      ? 'Вас ещё не распределили в домик. Обратитесь к вожатому или администратору.'
      : 'За вами пока не закреплён домик. Обратитесь к администратору.';
  }

  roleLabel(role: string): string {
    return this.roleLabels[role] ?? role;
  }

  genderIcon(gender: string): string {
    return gender === 'м' ? '♂' : gender === 'ж' ? '♀' : '';
  }

  initials(p: any): string {
    return [p.last_name, p.first_name]
      .filter(Boolean)
      .map((w: string) => w[0]?.toUpperCase())
      .join('');
  }
}

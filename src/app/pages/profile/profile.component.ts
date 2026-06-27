import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService, Theme } from '../../services/theme.service';
import { IconComponent } from '../../shared/icon.component';

interface UserData {
  id: number;
  full_name: string;
  username: string;
  role: string;
  is_active: boolean;
  theme?: string;
  // participant fields
  last_name?: string;
  first_name?: string;
  birth_date?: string;
  age?: number;
  gender?: string;
  city?: string;
  house_name?: string;
  has_points?: boolean;
  total_points?: number;
  // staff fields
  responsible_houses?: { id: number; name: string; rank_level: number }[];
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class UserProfileComponent implements OnInit {
  user: UserData | null = null;
  loading = true;
  error = '';

  /** true когда смотрим на себя (/profile или /users/myId) */
  isSelf = false;

  themeLoading = false;
  themeSuccess = false;
  themeError = false;

  private readonly roleColors: Record<string, string> = {
    superadmin: '#7C3AED',
    admin: '#0EA5E9',
    counselor: '#22C55E',
    helper: '#F97316',
    staff: '#78716C',
    participant: '#1a5c38',
  };

  constructor(
    public auth: AuthService,
    public themeService: ThemeService,
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    // Если маршрут /profile — редиректим на /users/:myId
    if (this.route.snapshot.routeConfig?.path === 'profile/me') {
      const myId = this.auth.currentUser()?.id;
      if (myId) {
        this.router.navigate(['/users', myId], { replaceUrl: true });
        return;
      }
    }

    const routeId = this.route.snapshot.paramMap.get('id');
    const myId = this.auth.currentUser()?.id;
    this.isSelf = routeId !== null && Number(routeId) === myId;

    // Для себя берём /auth/me (содержит тему, баллы, домик участника)
    const endpoint = this.isSelf ? '/auth/me' : `/users/${routeId}`;

    this.api.get<UserData>(endpoint).subscribe({
      next: (data) => {
        this.user = data;
        this.loading = false;
        // Синхронизируем локальную тему если смотрим на себя
        if (this.isSelf && data.theme) {
          // ThemeService уже применил тему при старте, но на случай
          // если пользователь сменил тему с другого устройства
          if (data.theme !== this.themeService.current) {
            this.themeService.setTheme(data.theme as Theme, this.auth.token);
          }
        }
      },
      error: () => {
        this.error = 'Не удалось загрузить данные профиля';
        this.loading = false;
      },
    });
  }

  get isDark(): boolean {
    return this.themeService.current === 'dark';
  }

  async setTheme(theme: Theme) {
    if (this.themeLoading || this.themeService.current === theme) return;
    this.themeLoading = true;
    this.themeSuccess = false;
    this.themeError = false;
    try {
      await this.themeService.setTheme(theme, this.auth.token);
      if (this.user) this.user.theme = theme;
      this.themeSuccess = true;
      setTimeout(() => (this.themeSuccess = false), 2500);
    } catch {
      this.themeError = true;
      setTimeout(() => (this.themeError = false), 2500);
    } finally {
      this.themeLoading = false;
    }
  }

  goBack() {
    this.router.navigate(['/users']);
  }

  get displayName(): string {
    return (
      this.user?.full_name ||
      [this.user?.last_name, this.user?.first_name].filter(Boolean).join(' ') ||
      '—'
    );
  }

  get roleLabel(): string {
    const map: Record<string, string> = {
      superadmin: 'Суперадмин',
      admin: 'Администратор',
      counselor: 'Вожатый',
      helper: 'Помощник',
      staff: 'Персонал',
      participant: 'Участник',
    };
    return map[this.user?.role ?? ''] ?? this.user?.role ?? '—';
  }

  get roleColor(): string {
    return this.roleColors[this.user?.role ?? ''] ?? '#78716C';
  }

  get roleColorBg(): string {
    const c = this.roleColor;
    const num = parseInt(c.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},0.1)`;
  }

  get genderLabel(): string | null {
    if (this.user?.gender === 'male') return 'Мужской';
    if (this.user?.gender === 'female') return 'Женский';
    return null;
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${d}.${m}.${y}`;
  }

  getUserInitials(): string {
    return this.displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }
}

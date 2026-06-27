import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  password_plain?: string;
  created_at?: string;
  updated_at?: string;
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
  imports: [CommonModule, FormsModule, IconComponent],
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

  // ─── Модалка редактирования ───
  editUser: any = null;
  newPassword = '';
  saving = false;
  saveError = '';

  readonly roles = ['admin', 'counselor', 'helper', 'staff'];

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
    const routeId = this.route.snapshot.paramMap.get('id');
    const myId = this.auth.currentUser()?.id;

    // Если зашли на /users/:id и это наш id — редиректим на /profile/me
    if (routeId !== null && Number(routeId) === myId) {
      this.router.navigate(['/profile/me'], { replaceUrl: true });
      return;
    }

    // Если зашли на /profile/me — грузим себя
    if (this.route.snapshot.routeConfig?.path === 'profile/me') {
      this.isSelf = true;
      this.api.get<UserData>('/auth/me').subscribe({
        next: (data) => {
          this.user = data;
          this.loading = false;
          if (data.theme && data.theme !== this.themeService.current) {
            this.themeService.setTheme(data.theme as Theme, this.auth.token);
          }
        },
        error: () => {
          this.error = 'Не удалось загрузить данные профиля';
          this.loading = false;
        },
      });
      return;
    }

    // Чужой профиль — /users/:id
    this.isSelf = false;
    this.api.get<UserData>(`/users/${routeId}`).subscribe({
      next: (data) => {
        this.user = data;
        this.loading = false;
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

  // ─── Редактирование профиля (модалка) ───

  startEdit() {
    if (!this.user) return;
    this.editUser = { ...this.user };
    this.newPassword = '';
    this.saveError = '';
  }

  closeEdit() {
    this.editUser = null;
    this.newPassword = '';
    this.saveError = '';
  }

  saveEdit() {
    if (!this.editUser) return;
    const body: any = {
      fullName: this.editUser.full_name,
      username: this.editUser.username,
      role: this.editUser.role,
      isActive: this.editUser.is_active,
    };
    if (this.newPassword) body.password = this.newPassword;

    this.saving = true;
    this.saveError = '';
    this.api.patch(`/users/${this.editUser.id}`, body).subscribe({
      next: () => {
        if (this.user) {
          this.user.full_name = this.editUser.full_name;
          this.user.username = this.editUser.username;
          this.user.role = this.editUser.role;
          this.user.is_active = this.editUser.is_active;
        }
        this.saving = false;
        this.closeEdit();
      },
      error: (e) => {
        this.saveError = e.error?.error || 'Ошибка сохранения';
        this.saving = false;
      },
    });
  }

  roleSelectLabel(role: string): string {
    const map: Record<string, string> = {
      superadmin: 'Суперадмин',
      admin: 'Администратор',
      counselor: 'Вожатый',
      helper: 'Помощник',
      staff: 'Персонал',
    };
    return map[role] ?? role;
  }

  get isSuperAdmin(): boolean {
    return this.auth.currentUser()?.role === 'superadmin';
  }
}

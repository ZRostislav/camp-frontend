import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService, Theme } from '../../services/theme.service';
import { IconComponent } from '../../shared/icon.component';

interface ProfileData {
  role: string;
  full_name?: string;
  fullName?: string;
  username?: string;
  id?: number;
  last_name?: string;
  first_name?: string;
  birth_date?: string;
  age?: number;
  gender?: string;
  city?: string;
  house_id?: number;
  house_name?: string;
  has_points?: boolean;
  total_points?: number;
  theme?: string;
  responsible_houses?: { id: number; name: string; rank_level: number }[];
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  profile: ProfileData | null = null;
  loading = true;
  error = '';

  themeLoading = false;
  themeSuccess = false;
  themeError = false;

  constructor(
    public auth: AuthService,
    public themeService: ThemeService,
    private api: ApiService,
  ) {}

  ngOnInit() {
    this.api.get<ProfileData>('/auth/me').subscribe({
      next: (data) => {
        this.profile = data;
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
      if (this.profile) this.profile.theme = theme;
      this.themeSuccess = true;
      setTimeout(() => (this.themeSuccess = false), 2500);
    } catch {
      this.themeError = true;
      setTimeout(() => (this.themeError = false), 2500);
    } finally {
      this.themeLoading = false;
    }
  }

  get displayName(): string {
    return (
      this.profile?.full_name ||
      this.profile?.fullName ||
      [this.profile?.last_name, this.profile?.first_name].filter(Boolean).join(' ') ||
      '—'
    );
  }

  get roleLabel(): string {
    const map: Record<string, string> = {
      superadmin: 'Суперадмин',
      admin: 'Администратор',
      counselor: 'Вожатый',
      helper: 'Помощник',
      participant: 'Участник',
    };
    return map[this.profile?.role ?? ''] ?? this.profile?.role ?? '—';
  }

  get genderLabel(): string {
    if (this.profile?.gender === 'male') return 'Мужской';
    if (this.profile?.gender === 'female') return 'Женский';
    return null as any;
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${d}.${m}.${y}`;
  }

  getUserInitials(): string {
    return this.displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}

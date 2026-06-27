import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { IconComponent } from '../../shared/icon.component';

interface UserData {
  id: number;
  full_name: string;
  username: string;
  role: string;
  is_active: boolean;
  responsible_houses?: { id: number; name: string; rank_level: number }[];
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './user-profile.component.html',
})
export class UserProfileComponent implements OnInit {
  user: UserData | null = null;
  loading = true;
  error = '';

  private readonly roleColors: Record<string, string> = {
    superadmin: '#7C3AED',
    admin: '#0EA5E9',
    counselor: '#22C55E',
    helper: '#F97316',
    staff: '#78716C',
  };

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.api.get<UserData>(`/users/${id}`).subscribe({
      next: (data) => {
        this.user = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Не удалось загрузить данные пользователя';
        this.loading = false;
      },
    });
  }

  get roleLabel(): string {
    const map: Record<string, string> = {
      superadmin: 'Суперадмин',
      admin: 'Администратор',
      counselor: 'Вожатый',
      helper: 'Помощник',
      staff: 'Персонал',
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

  getUserInitials(): string {
    return (this.user?.full_name ?? '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { ThemeService, Theme } from '../../services/theme.service';
import { PushService } from '../../services/push.service';
import { IconComponent } from '../../shared/icon.component';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';

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
  house_id?: number;
  house_name?: string;
  has_points?: boolean;
  total_points?: number;
  access_code?: string;
  // staff fields
  responsible_houses?: { id: number; name: string; rank_level: number }[];
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, MediaUrlPipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class UserProfileComponent implements OnInit {
  user: UserData | null = null;
  loading = true;
  error = '';

  /** true когда смотрим на себя (/profile или /users/myId) */
  isSelf = false;

  /** true когда открыт профиль участника лагеря (через /participants/:id) */
  isParticipant = false;

  /**
   * URL, откуда пришёл переход (например, страница домика) — если задан,
   * стрелка "назад" возвращает именно туда, а не в общий список.
   * Прокидывается через router state (см. house.component openParticipant/
   * openResponsible), поэтому переживает обычную навигацию, но теряется
   * при обновлении страницы (F5) — это ожидаемо.
   */
  private returnUrl: string | null = null;

  /** список домиков — нужен для формы редактирования участника */
  houses: any[] = [];

  themeLoading = false;
  themeSuccess = false;
  themeError = false;

  // ─── Push-уведомления ───
  pushSupported = true;
  pushSubscribed = false;
  pushLoading = false;
  pushError = '';

  campColor = '#1a5c38';

  // ─── Модалка редактирования (staff) ───
  editUser: any = null;
  newPassword = '';
  saving = false;
  saveError = '';

  // ─── Модалка смены пароля (self staff) ───
  changePasswordOpen = false;
  currentPassword = '';
  newStaffPassword = '';
  newStaffPasswordConfirm = '';
  changingPassword = false;
  changePasswordError = '';
  changePasswordSuccess = '';

  // ─── Модалка редактирования (participant) ───
  editParticipant: any = null;
  savingParticipant = false;
  saveParticipantError = '';

  // ─── Модалка подтверждения (сброс кода / удаление) ───
  confirmState: {
    title: string;
    message: string;
    confirmLabel: string;
    danger: boolean;
    action: () => void;
  } | null = null;

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
    private push: PushService,
    private api: ApiService,
    private settings: SettingsService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.returnUrl = (history.state as any)?.returnUrl ?? null;

    this.pushSupported = this.push.isSupported();
    if (this.pushSupported) {
      this.push.getExistingSubscription().then((sub) => {
        this.pushSubscribed = !!sub;
      });
    }

    this.settings.get().subscribe({
      next: (d) => {
        this.campColor = (d['camp_color'] as string) ?? '#1a5c38';
      },
      error: () => {},
    });

    // Домики нужны на любом профиле: и участнику (свой домик), и персоналу
    // (закреплённые домики), чтобы корректно показать аватар/эмодзи/иконку.
    this.api.get('/houses').subscribe({
      next: (d: any) => (this.houses = d),
      error: () => {},
    });

    const routeId = this.route.snapshot.paramMap.get('id');
    const myId = this.auth.currentUser()?.id;
    const routePath = this.route.snapshot.routeConfig?.path;

    if (routePath === 'participants/:id') {
      this.isSelf = false;
      this.isParticipant = true;
      this.api.get<UserData>(`/participants/${routeId}`).subscribe({
        next: (data) => {
          this.user = data;
          this.loading = false;
        },
        error: () => {
          this.error = 'Не удалось загрузить данные участника';
          this.loading = false;
        },
      });
      return;
    }

    if (routeId !== null && Number(routeId) === myId) {
      this.router.navigate(['/profile/me'], { replaceUrl: true });
      return;
    }

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

  get campColorBg(): string {
    const num = parseInt(this.campColor.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},0.08)`;
  }

  getHouse(houseId: any): any {
    return this.houses.find((h) => h.id == houseId) ?? null;
  }

  getHouseColor(houseId: any): string {
    return this.getHouse(houseId)?.color || this.campColor;
  }

  getHouseEmoji(houseId: any): string {
    return this.getHouse(houseId)?.emoji || '';
  }

  getHouseAvatar(houseId: any): string | null {
    return this.getHouse(houseId)?.avatar_path ?? null;
  }

  // ─── Push-уведомления ────────────────────────────────────────────────

  async onEnablePush(): Promise<void> {
    if (this.pushLoading) return;
    this.pushLoading = true;
    this.pushError = '';
    try {
      await this.push.subscribeUser();
      this.pushSubscribed = true;
    } catch (err: any) {
      this.pushError = err?.message || 'Не удалось включить уведомления';
    } finally {
      this.pushLoading = false;
    }
  }

  async onDisablePush(): Promise<void> {
    if (this.pushLoading) return;
    this.pushLoading = true;
    this.pushError = '';
    try {
      await this.push.unsubscribeUser();
      this.pushSubscribed = false;
    } catch {
      this.pushError = 'Не удалось отключить уведомления';
    } finally {
      this.pushLoading = false;
    }
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

  get backLabel(): string {
    if (this.returnUrl) return 'Назад';
    return this.isParticipant
      ? 'К списку участников'
      : 'К списку пользователей';
  }

  goBack() {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
      return;
    }
    this.router.navigate([this.isParticipant ? '/participants' : '/users']);
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

  startEdit() {
    if (!this.user) return;
    if (this.isParticipant) {
      this.editParticipant = {
        ...this.user,
        houseId: (this.user as any).house_id,
      };
      this.saveParticipantError = '';
      return;
    }
    this.editUser = { ...this.user };
    this.newPassword = '';
    this.saveError = '';
  }

  openChangePassword() {
    if (!this.canChangeOwnPassword) return;
    this.changePasswordOpen = true;
    this.currentPassword = '';
    this.newStaffPassword = '';
    this.newStaffPasswordConfirm = '';
    this.changePasswordError = '';
    this.changePasswordSuccess = '';
  }

  closeChangePassword() {
    this.changePasswordOpen = false;
    this.currentPassword = '';
    this.newStaffPassword = '';
    this.newStaffPasswordConfirm = '';
    this.changePasswordError = '';
  }

  saveChangePassword() {
    if (!this.canChangeOwnPassword) return;
    if (
      !this.currentPassword ||
      !this.newStaffPassword ||
      !this.newStaffPasswordConfirm
    ) {
      this.changePasswordError = 'Заполните все поля';
      return;
    }
    if (this.newStaffPassword !== this.newStaffPasswordConfirm) {
      this.changePasswordError = 'Новые пароли не совпадают';
      return;
    }

    this.changingPassword = true;
    this.changePasswordError = '';
    this.changePasswordSuccess = '';
    this.auth
      .changeOwnPassword(
        this.currentPassword,
        this.newStaffPassword,
        this.newStaffPasswordConfirm,
      )
      .subscribe({
        next: () => {
          this.changingPassword = false;
          this.changePasswordSuccess = 'Пароль изменен';
          setTimeout(() => {
            this.changePasswordSuccess = '';
            this.closeChangePassword();
          }, 1200);
        },
        error: (e) => {
          this.changePasswordError = e.error?.error || 'Ошибка смены пароля';
          this.changingPassword = false;
        },
      });
  }

  closeEdit() {
    this.editUser = null;
    this.newPassword = '';
    this.saveError = '';
  }

  closeEditParticipant() {
    this.editParticipant = null;
    this.saveParticipantError = '';
  }

  saveEditParticipant() {
    if (!this.editParticipant) return;
    const body = {
      lastName: this.editParticipant.last_name,
      firstName: this.editParticipant.first_name,
      birthDate: this.editParticipant.birth_date,
      gender: this.editParticipant.gender,
      city: this.editParticipant.city,
      houseId: this.editParticipant.houseId || null,
      hasPoints: this.editParticipant.has_points,
    };
    this.savingParticipant = true;
    this.saveParticipantError = '';
    this.api.put(`/participants/${this.editParticipant.id}`, body).subscribe({
      next: (updated: any) => {
        this.user = { ...this.user, ...updated };
        this.savingParticipant = false;
        this.closeEditParticipant();
      },
      error: (e) => {
        this.saveParticipantError = e.error?.error || 'Ошибка сохранения';
        this.savingParticipant = false;
      },
    });
  }

  resetParticipantCode() {
    if (!this.user) return;
    this.confirmState = {
      title: 'Сбросить код доступа?',
      message:
        'Текущий код перестанет работать. Участнику нужно будет сообщить новый код.',
      confirmLabel: 'Сбросить',
      danger: false,
      action: () => this.doResetParticipantCode(),
    };
  }

  private doResetParticipantCode() {
    if (!this.user) return;
    this.api
      .post<any>(`/participants/${this.user.id}/reset-code`, {})
      .subscribe({
        next: (d) => {
          if (this.user) (this.user as any).access_code = d.access_code;
        },
        error: () => {
          this.error = 'Не удалось сбросить код доступа';
        },
      });
  }

  removeParticipant() {
    if (!this.user) return;
    this.confirmState = {
      title: 'Удалить участника?',
      message: 'Это действие необратимо. Все данные участника будут удалены.',
      confirmLabel: 'Удалить',
      danger: true,
      action: () => this.doRemoveParticipant(),
    };
  }

  private doRemoveParticipant() {
    if (!this.user) return;
    this.api.delete(`/participants/${this.user.id}`).subscribe({
      next: () => {
        this.router.navigate(['/participants']);
      },
      error: () => {
        this.error = 'Не удалось удалить участника';
      },
    });
  }

  confirmYes() {
    const action = this.confirmState?.action;
    this.confirmState = null;
    action?.();
  }

  confirmNo() {
    this.confirmState = null;
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

  get canChangeOwnPassword(): boolean {
    return this.isSelf && this.auth.isStaff();
  }
}

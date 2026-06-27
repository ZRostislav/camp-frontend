import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, IconComponent],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  users: any[] = [];
  form: any = { fullName: '', username: '', role: 'admin', password: '' };
  editUser: any = null;
  newPassword = '';
  error = '';
  msg = '';
  roles = ['admin', 'counselor', 'helper', 'staff'];

  showCreateForm = false;
  campColor = '#F59E0B';

  // ─── Заявки на регистрацию ───
  registrations: any[] = [];
  registrationsStatus: 'pending' | 'approved' | 'rejected' | 'all' = 'pending';
  regOverrideRole: { [id: number]: string } = {};

  readonly registrationStatuses = [
    { value: 'pending', label: 'Ожидают' },
    { value: 'approved', label: 'Одобренные' },
    { value: 'rejected', label: 'Отклонённые' },
    { value: 'all', label: 'Все' },
  ] as const;

  private readonly roleColors: Record<string, string> = {
    superadmin: '#7C3AED',
    admin: '#0EA5E9',
    counselor: '#22C55E',
    helper: '#F97316',
    staff: '#78716C',
  };

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
    private router: Router,
  ) {}

  ngOnInit() {
    this.settings.get().subscribe({
      next: (d) => {
        this.campColor = (d['camp_color'] as string) ?? '#F59E0B';
      },
      error: () => {},
    });
    this.load();
    if (this.auth.isAdmin()) this.loadRegistrations();
  }

  get campColorBg(): string {
    const num = parseInt(this.campColor.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},0.08)`;
  }

  roleColor(role: string): string {
    return this.roleColors[role] ?? '#78716C';
  }

  roleLabel(role: string): string {
    return this.roleLabels[role] ?? role;
  }

  initials(fullName: string): string {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  load() {
    this.api.get('/users').subscribe({
      next: (d: any) => (this.users = d),
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  create() {
    this.api.post('/users', this.form).subscribe({
      next: () => {
        this.msg = 'Пользователь создан';
        this.form = { fullName: '', username: '', role: 'admin', password: '' };
        this.showCreateForm = false;
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  startEdit(u: any) {
    this.editUser = { ...u };
    this.newPassword = '';
    this.showCreateForm = false;
  }

  viewUser(u: any) {
    this.router.navigate(['/users', u.id]);
  }

  saveEdit() {
    const body: any = {
      fullName: this.editUser.full_name,
      username: this.editUser.username,
      role: this.editUser.role,
      isActive: this.editUser.is_active,
    };
    if (this.newPassword) body.password = this.newPassword;
    this.api.patch(`/users/${this.editUser.id}`, body).subscribe({
      next: () => {
        this.editUser = null;
        this.newPassword = '';
        this.msg = 'Изменения сохранены';
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  remove(id: number) {
    if (!confirm('Удалить пользователя?')) return;
    this.api.delete(`/users/${id}`).subscribe({
      next: () => {
        this.msg = 'Удалён';
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  // ─── Заявки ───

  loadRegistrations() {
    this.api
      .get('/users/registrations', { status: this.registrationsStatus })
      .subscribe({
        next: (d: any) => (this.registrations = d),
        error: (e) => (this.error = e.error?.error || 'Ошибка загрузки заявок'),
      });
  }

  onRegistrationsStatusChange() {
    this.loadRegistrations();
  }

  approve(reg: any) {
    const overrideRole = this.regOverrideRole[reg.id];
    const body =
      overrideRole && overrideRole !== reg.requested_role
        ? { role: overrideRole }
        : {};
    this.api.post(`/users/registrations/${reg.id}/approve`, body).subscribe({
      next: () => {
        this.msg = 'Заявка одобрена';
        this.loadRegistrations();
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка одобрения заявки'),
    });
  }

  reject(reg: any) {
    const reason = prompt('Причина отклонения (необязательно):') || undefined;
    this.api
      .post(`/users/registrations/${reg.id}/reject`, { reason })
      .subscribe({
        next: () => {
          this.msg = 'Заявка отклонена';
          this.loadRegistrations();
        },
        error: (e) =>
          (this.error = e.error?.error || 'Ошибка отклонения заявки'),
      });
  }

  deleteRegistration(id: number) {
    if (!confirm('Удалить заявку?')) return;
    this.api.delete(`/users/registrations/${id}`).subscribe({
      next: () => {
        this.msg = 'Заявка удалена';
        this.loadRegistrations();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка удаления заявки'),
    });
  }
}

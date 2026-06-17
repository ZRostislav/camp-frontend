import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  // ─── Заявки на регистрацию ───
  registrations: any[] = [];
  registrationsStatus: 'pending' | 'approved' | 'rejected' | 'all' = 'pending';
  regOverrideRole: { [id: number]: string } = {};

  constructor(
    public auth: AuthService,
    private api: ApiService,
  ) {}

  ngOnInit() {
    this.load();
    if (this.auth.isAdmin()) this.loadRegistrations();
  }

  load() {
    this.api
      .get('/users')
      .subscribe({
        next: (d: any) => (this.users = d),
        error: (e) => (this.error = e.error?.error || 'Ошибка'),
      });
  }

  create() {
    this.api.post('/users', this.form).subscribe({
      next: () => {
        this.msg = 'Создан';
        this.form = { fullName: '', username: '', role: 'admin', password: '' };
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  startEdit(u: any) {
    this.editUser = { ...u };
    this.newPassword = '';
  }

  saveEdit() {
    const body: any = {
      fullName: this.editUser.full_name,
      username: this.editUser.username,
      role: this.editUser.role,
      isActive: this.editUser.is_active,
    };
    if (this.newPassword) {
      body.password = this.newPassword;
    }
    this.api.patch(`/users/${this.editUser.id}`, body).subscribe({
      next: () => {
        this.editUser = null;
        this.newPassword = '';
        this.msg = 'Сохранено';
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  remove(id: number) {
    if (!confirm('Удалить?')) return;
    this.api.delete(`/users/${id}`).subscribe({
      next: () => {
        this.msg = 'Удалён';
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  // ─── Заявки на регистрацию (admin / superadmin) ───

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

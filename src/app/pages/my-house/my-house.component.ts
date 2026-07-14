import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';
import { ObjectUrlPipe } from '../../pipes/object-url.pipe';
import { IconComponent } from '../../shared/icon.component';

// "Мой домик" — страница для участника (его собственный домик) и
// вожатого/помощника (домик, закреплённый за ним через house_responsible).
// Данные приходят с бэкенда уже отфильтрованными по доступу к коду
// доступа (access_code): для counselor/helper — виден их домика,
// для participant — не виден никогда (см. src/utils/houseAccess.js).
@Component({
  selector: 'app-my-house',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MediaUrlPipe,
    ObjectUrlPipe,
    IconComponent,
  ],
  templateUrl: './my-house.component.html',
  styleUrl: './my-house.component.css',
})
export class MyHouseComponent implements OnInit {
  house: any = null;
  loading = true;
  error = '';
  msg = '';
  editing = false;
  editForm: any = { name: '', description: '', emoji: '' };
  editFiles: File[] = [];
  saving = false;

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
    this.msg = '';
    this.api.get('/houses/mine').subscribe({
      next: (d: any) => {
        this.house = d;
        this.resetEditForm();
        this.loading = false;
      },
      error: (e) => {
        this.error = e.error?.error || 'Ошибка загрузки';
        this.house = null;
        this.loading = false;
      },
    });
  }

  get canManageMyHouse(): boolean {
    return this.auth.role !== 'participant';
  }

  startEdit() {
    this.resetEditForm();
    this.editing = true;
  }

  cancelEdit() {
    this.editing = false;
    this.editFiles = [];
    this.resetEditForm();
  }

  private resetEditForm() {
    this.editForm = {
      name: this.house?.name || '',
      description: this.house?.description || '',
      emoji: this.house?.emoji || '',
    };
    this.editFiles = [];
  }

  onEditAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.editFiles = [input.files[0]];
    this.editForm.emoji = '';
    input.value = '';
  }

  removeEditAvatar() {
    this.editFiles = [];
  }

  deleteAvatar() {
    if (!this.house?.id) return;
    this.saving = true;
    this.error = '';
    this.api.delete(`/houses/${this.house.id}/avatar`).subscribe({
      next: () => {
        this.msg = 'Аватар удален';
        this.saving = false;
        this.load();
      },
      error: (e: any) => {
        this.error = e.error?.error || 'Ошибка';
        this.saving = false;
      },
    });
  }

  saveEdit() {
    if (!this.house?.id || !this.editForm.name.trim()) {
      this.error = 'Укажите название домика';
      return;
    }

    this.saving = true;
    this.error = '';
    this.msg = '';

    this.api
      .put(`/houses/${this.house.id}`, {
        name: this.editForm.name.trim(),
        description: this.editForm.description || null,
        emoji: this.editForm.emoji || null,
      })
      .subscribe({
        next: () => {
          if (!this.editFiles.length) {
            this.finishSave();
            return;
          }

          const fd = new FormData();
          fd.append('avatar', this.editFiles[0]);
          this.api
            .postFormData(`/houses/${this.house.id}/avatar`, fd)
            .subscribe({
              next: () => this.finishSave(),
              error: (e: any) => {
                this.error = e.error?.error || 'Ошибка загрузки аватара';
                this.saving = false;
              },
            });
        },
        error: (e: any) => {
          this.error = e.error?.error || 'Ошибка';
          this.saving = false;
        },
      });
  }

  private finishSave() {
    this.msg = 'Домик сохранен';
    this.editing = false;
    this.saving = false;
    this.load();
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

  /**
   * Инициалы. Участники приходят как {last_name, first_name},
   * а ответственные (house.responsible) — только как {full_name},
   * поэтому раньше initials(r) для ответственных всегда возвращал ''
   * и в кружочке был виден только "?" по фолбэку в шаблоне.
   */
  initials(p: any): string {
    if (p?.last_name || p?.first_name) {
      return [p.last_name, p.first_name]
        .filter(Boolean)
        .map((w: string) => w[0]?.toUpperCase())
        .join('');
    }
    if (p?.full_name) {
      return p.full_name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase())
        .join('');
    }
    return '';
  }

  fileSize(f: File) {
    const mb = f.size / 1024 / 1024;
    return mb < 1 ? `${(f.size / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
  }
}

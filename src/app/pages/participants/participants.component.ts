import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { IconComponent } from '../../shared/icon.component';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';

@Component({
  selector: 'app-participants',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, MediaUrlPipe],
  templateUrl: './participants.component.html',
})
export class ParticipantsComponent implements OnInit {
  participants: any[] = [];
  houses: any[] = [];
  searchQuery = '';
  filterHouseId: any = '';
  showForm = false;

  form: any = {
    lastName: '',
    firstName: '',
    birthDate: '',
    gender: 'м',
    city: '',
    houseId: '',
    hasPoints: true,
  };

  editItem: any = null;
  viewMode: 'list' | 'compact' | 'grid' = 'list';
  error = '';
  msg = '';

  campColor = '#F59E0B';

  /** Глобальная настройка: включена ли система баллов участников. */
  participantPointsEnabled = true;

  confirmState: {
    title: string;
    message: string;
    confirmLabel: string;
    danger: boolean;
    action: () => void;
  } | null = null;

  get campColorBg(): string {
    const num = parseInt(this.campColor.replace('#', ''), 16);
    return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},0.1)`;
  }

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
        this.participantPointsEnabled =
          d['participant_points_enabled'] === true;
        if (!this.participantPointsEnabled) {
          this.form.hasPoints = false;
        }
      },
      error: () => {},
    });
    this.load();
    this.api.get('/houses').subscribe({
      next: (d: any) => (this.houses = d),
      error: () => {},
    });
  }

  load() {
    const params: any = {};
    if (this.searchQuery) params['search'] = this.searchQuery;
    if (this.filterHouseId) params['houseId'] = this.filterHouseId;
    this.api.get('/participants', params).subscribe({
      next: (d: any) => (this.participants = d),
      error: (e) => this.showError(e.error?.error || 'Ошибка загрузки'),
    });
  }

  setHouseFilter(id: any) {
    this.filterHouseId = this.filterHouseId == id ? '' : id;
    this.load();
  }

  create() {
    this.error = '';
    const body = { ...this.form, houseId: this.form.houseId || null };
    this.api.post('/participants', body).subscribe({
      next: () => {
        this.showMsg('Участник создан');
        this.showForm = false;
        this.form = {
          lastName: '',
          firstName: '',
          birthDate: '',
          gender: 'м',
          city: '',
          houseId: '',
          hasPoints: true,
        };
        this.load();
      },
      error: (e) => this.showError(e.error?.error || 'Ошибка'),
    });
  }

  startEdit(p: any) {
    this.editItem = { ...p, houseId: p.house_id };
    this.showForm = false;
  }

  openProfile(p: any) {
    this.router.navigate(['/participants', p.id]);
  }

  saveEdit() {
    this.error = '';
    const body = {
      lastName: this.editItem.last_name,
      firstName: this.editItem.first_name,
      birthDate: this.editItem.birth_date,
      gender: this.editItem.gender,
      city: this.editItem.city,
      houseId: this.editItem.houseId || null,
      hasPoints: this.editItem.has_points,
    };
    this.api.put(`/participants/${this.editItem.id}`, body).subscribe({
      next: () => {
        this.editItem = null;
        this.showMsg('Сохранено');
        this.load();
      },
      error: (e) => this.showError(e.error?.error || 'Ошибка'),
    });
  }

  resetCode(id: number) {
    this.confirmState = {
      title: 'Сбросить код доступа?',
      message:
        'Текущий код перестанет работать. Участнику нужно будет сообщить новый код.',
      confirmLabel: 'Сбросить',
      danger: false,
      action: () => this.doResetCode(id),
    };
  }

  private doResetCode(id: number) {
    this.api.post(`/participants/${id}/reset-code`, {}).subscribe({
      next: (d: any) => {
        this.showMsg(`Новый код: ${d.access_code}`);
        this.load();
      },
      error: (e) => this.showError(e.error?.error || 'Ошибка'),
    });
  }

  remove(id: number) {
    this.confirmState = {
      title: 'Удалить участника?',
      message: 'Это действие необратимо. Все данные участника будут удалены.',
      confirmLabel: 'Удалить',
      danger: true,
      action: () => this.doRemove(id),
    };
  }

  private doRemove(id: number) {
    this.api.delete(`/participants/${id}`).subscribe({
      next: () => {
        this.showMsg('Удалён');
        this.load();
      },
      error: (e) => this.showError(e.error?.error || 'Ошибка'),
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

  initials(p: any): string {
    const l = (p.last_name ?? '').charAt(0).toUpperCase();
    const f = (p.first_name ?? '').charAt(0).toUpperCase();
    return l + f || '?';
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

  private showMsg(text: string) {
    this.msg = text;
    this.error = '';
    setTimeout(() => (this.msg = ''), 3500);
  }

  private showError(text: string) {
    this.error = text;
    setTimeout(() => (this.error = ''), 4000);
  }
}

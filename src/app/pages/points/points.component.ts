import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { IconComponent } from '../../shared/icon.component';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';

@Component({
  selector: 'app-points',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, MediaUrlPipe],
  templateUrl: './points.component.html',
  styleUrl: './points.component.css',
})
export class PointsComponent implements OnInit {
  houses: any[] = [];
  participants: any[] = [];
  mode: 'participant' | 'house' = 'participant';
  selectedId: any = '';
  selectorQuery = '';
  selectorOpen = false;
  history: any = null;
  recentHistory: any[] = [];
  loadingRecent = false;
  addForm: any = { points: 0, reason: '' };
  editEntry: any = null;
  error = '';
  msg = '';

  campColor = '#F59E0B';

  pointsFilter: 'all' | 'positive' | 'negative' = 'all';
  searchQuery = '';

  filters = [
    { key: 'all', label: 'Все' },
    { key: 'positive', label: '✅ Начисления' },
    { key: 'negative', label: '❌ Списания' },
  ];

  quickPoints = [-10, -5, +5, +10, +25, +50];

  quickReasons = [
    'Победа в конкурсе',
    'Отличное поведение',
    'Помощь другим',
    'Победа в спортивном мероприятии',
    'Творческое задание',
    'Нарушение правил',
    'Опоздание',
  ];

  get campColorBg(): string {
    const num = parseInt(this.campColor.replace('#', ''), 16);
    return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},0.1)`;
  }

  get filteredHistory(): any[] {
    if (!this.history?.history) return [];
    const q = this.searchQuery.toLowerCase().trim();
    return this.history.history.filter((e: any) => {
      const matchFilter =
        this.pointsFilter === 'all' ||
        (this.pointsFilter === 'positive' && e.points >= 0) ||
        (this.pointsFilter === 'negative' && e.points < 0);
      const matchSearch =
        !q ||
        (e.reason ?? '').toLowerCase().includes(q) ||
        (e.created_by_name ?? '').toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }

  /** Список участников или домиков, отфильтрованный по поисковому запросу селектора. */
  get filteredSelectorOptions(): any[] {
    const q = this.selectorQuery.toLowerCase().trim();
    const list = this.mode === 'participant' ? this.participants : this.houses;
    if (!q) return list;
    return list.filter((item: any) => {
      if (this.mode === 'participant') {
        const fullName =
          `${item.last_name ?? ''} ${item.first_name ?? ''}`.toLowerCase();
        const houseName = (item.house_name ?? '').toLowerCase();
        return fullName.includes(q) || houseName.includes(q);
      }
      return (item.name ?? '').toLowerCase().includes(q);
    });
  }

  /** Текущий выбранный участник/домик — для отображения в поле селектора. */
  get selectedItem(): any {
    const list = this.mode === 'participant' ? this.participants : this.houses;
    return list.find((item: any) => item.id == this.selectedId) ?? null;
  }

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
    this.api
      .get('/houses')
      .subscribe({ next: (d: any) => (this.houses = d), error: () => {} });
    this.api.get('/participants').subscribe({
      next: (d: any) => (this.participants = d),
      error: () => {},
    });
    this.loadRecentActivity();
  }

  /** Переключение режима участник/домик со сбросом выбора и поиска. */
  setMode(m: 'participant' | 'house') {
    this.mode = m;
    this.selectedId = '';
    this.selectorQuery = '';
    this.selectorOpen = false;
    this.history = null;
    this.error = '';
    this.msg = '';
    this.loadRecentActivity();
  }

  openSelector() {
    this.selectorOpen = true;
    this.selectorQuery = '';
  }

  closeSelector() {
    this.selectorOpen = false;
  }

  selectItem(item: any) {
    this.selectedId = item.id;
    this.selectorOpen = false;
    this.selectorQuery = '';
    this.loadHistory();
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

  loadHistory() {
    if (!this.selectedId) return;
    this.history = null;
    const path =
      this.mode === 'participant'
        ? `/points/participant/${this.selectedId}/history`
        : `/points/house/${this.selectedId}/history`;
    this.api.get(path).subscribe({
      next: (d: any) => (this.history = d),
      error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  /**
   * Лента последних начислений/списаний — показывается вместо истории,
   * пока не выбран конкретный участник/домик (mode переключает, по кому
   * именно). ПРЕДПОЛАГАЕМЫЙ эндпоинт бэкенда:
   *   GET /points/recent?mode=participant|house&limit=15
   * возвращает записи в формате .../history (points, reason, created_at,
   * created_by_name) + participant_id или house_id.
   * Если на бэкенде путь/параметры другие — правьте только этот метод.
   */
  loadRecentActivity() {
    this.loadingRecent = true;
    this.api.get('/points/recent', { mode: this.mode, limit: 15 }).subscribe({
      next: (d: any) => {
        this.recentHistory = d ?? [];
        this.loadingRecent = false;
      },
      error: () => {
        this.recentHistory = [];
        this.loadingRecent = false;
      },
    });
  }

  /** Имя участника/домика для строки в ленте последних начислений. */
  recentItemName(e: any): string {
    if (this.mode === 'participant') {
      const p = this.participants.find((x) => x.id == e.participant_id);
      return p ? `${p.last_name} ${p.first_name}` : '—';
    }
    const h = this.houses.find((x) => x.id == e.house_id);
    return h ? h.name : '—';
  }

  /** Клик по строке ленты — сразу открывает историю этого участника/домика. */
  selectFromRecent(e: any) {
    const id = this.mode === 'participant' ? e.participant_id : e.house_id;
    if (!id) return;
    this.selectItem({ id });
  }

  addPoints() {
    const path =
      this.mode === 'participant'
        ? `/points/participant/${this.selectedId}`
        : `/points/house/${this.selectedId}`;
    this.api
      .post(path, {
        points: Number(this.addForm.points),
        reason: this.addForm.reason,
      })
      .subscribe({
        next: () => {
          this.msg = 'Баллы начислены';
          this.addForm = { points: 0, reason: '' };
          this.loadHistory();
          this.loadRecentActivity();
        },
        error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
      });
  }

  startEdit(e: any) {
    this.editEntry = { ...e };
  }

  saveEdit() {
    this.api
      .put(`/points/entries/${this.editEntry.id}`, {
        points: Number(this.editEntry.points),
        reason: this.editEntry.reason,
      })
      .subscribe({
        next: () => {
          this.editEntry = null;
          this.msg = 'Обновлено';
          this.loadHistory();
          this.loadRecentActivity();
        },
        error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
      });
  }

  deleteEntry(id: number) {
    if (!confirm('Удалить запись?')) return;
    this.api.delete(`/points/entries/${id}`).subscribe({
      next: () => {
        this.msg = 'Удалено';
        this.loadHistory();
        this.loadRecentActivity();
      },
      error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
    });
  }
}

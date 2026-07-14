import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { IconComponent } from '../../shared/icon.component';

type EventStatus = 'будет' | 'идёт' | 'завершено';

interface EventWinner {
  house_id: number;
  house_name: string;
  house_emoji: string | null;
  points: number;
}

interface EventItem {
  id: number;
  emoji: string | null;
  title: string;
  description: string | null;
  event_time: string | null;
  points: number;
  finished_at: string | null;
  status: EventStatus;
  created_at: string;
  youtube_links: { id: number; url: string; label: string | null }[];
  winners: EventWinner[];
  is_read: boolean;
  // UI-only, добавляется на клиенте при открытии выбора победителей
  _winnerSelection?: Set<number>;
}

interface House {
  id: number;
  name: string;
  emoji: string | null;
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PickerComponent,
    IconComponent,
    DatePipe,
  ],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css',
})
export class EventsComponent implements OnInit {
  events: EventItem[] = [];
  houses: House[] = [];

  form: any = {
    emoji: '',
    title: '',
    description: '',
    event_time: '',
    points: 0,
  };
  formLinks: { url: string; label: string }[] = [];
  showFormEmojiPicker = false;
  showCreateForm = false;

  editItem: any = null;
  editNewLinks: { url: string; label: string }[] = [];
  showEditEmojiPicker = false;

  // id событий, для которых сейчас открыт выбор победителей
  winnerPickerOpenFor: Set<number> = new Set();

  error = '';
  msg = '';

  campColor = '#F59E0B';

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private elRef: ElementRef,
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
    if (this.auth.isAdmin()) {
      this.loadHouses();
    }
  }

  get campColorBg(): string {
    return this.hexToRgba(this.campColor, 0.12);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ── Загрузка данных ─────────────────────────────────────────────────────

  load() {
    this.api.get('/events').subscribe({
      next: (d: any) => (this.events = d),
      error: (e: any) => (this.error = e.error?.error || 'Ошибка загрузки'),
    });
  }

  loadHouses() {
    this.api.get('/houses').subscribe({
      next: (d: any) => (this.houses = d),
      error: () => {},
    });
  }

  // ── Статус события ───────────────────────────────────────────────────────

  statusLabel(c: EventItem): string {
    return c.status;
  }

  /** Возвращает набор классов для бейджа статуса — по смыслу, не по кампус-теме */
  statusClasses(c: EventItem): string {
    switch (c.status) {
      case 'идёт':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'завершено':
        return 'bg-green-50 border-green-200 text-green-700';
      default:
        return 'bg-sky-50 border-sky-200 text-sky-700';
    }
  }

  statusIcon(c: EventItem): string {
    switch (c.status) {
      case 'идёт':
        return 'zap';
      case 'завершено':
        return 'trophy';
      default:
        return 'calendar-clock';
    }
  }

  // ── Склонение слова "балл" ───────────────────────────────────────────────

  pointsWord(n: number): string {
    const abs = Math.abs(Math.round(n)) % 100;
    const n1 = abs % 10;
    if (abs > 10 && abs < 20) return 'баллов';
    if (n1 > 1 && n1 < 5) return 'балла';
    if (n1 === 1) return 'балл';
    return 'баллов';
  }

  // ── Прочитано ────────────────────────────────────────────────────────────

  markRead(c: EventItem): void {
    if (c.is_read) return;
    this.api.post<any>(`/events/${c.id}/read`, {}).subscribe({
      next: () => {
        c.is_read = true;
      },
      error: () => {},
    });
  }

  // ── Emoji picker ─────────────────────────────────────────────────────────

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.showFormEmojiPicker = false;
      this.showEditEmojiPicker = false;
    }
  }

  toggleFormEmojiPicker(event: MouseEvent) {
    event.stopPropagation();
    this.showFormEmojiPicker = !this.showFormEmojiPicker;
    this.showEditEmojiPicker = false;
  }

  toggleEditEmojiPicker(event: MouseEvent) {
    event.stopPropagation();
    this.showEditEmojiPicker = !this.showEditEmojiPicker;
    this.showFormEmojiPicker = false;
  }

  onFormEmojiSelect(event: any) {
    this.form.emoji = event.emoji.native;
    this.showFormEmojiPicker = false;
  }

  onEditEmojiSelect(event: any) {
    this.editItem.emoji = event.emoji.native;
    this.showEditEmojiPicker = false;
  }

  // ── YouTube-ссылки ───────────────────────────────────────────────────────

  addFormLink() {
    this.formLinks.push({ url: '', label: '' });
  }
  removeFormLink(i: number) {
    this.formLinks = this.formLinks.filter((_, idx) => idx !== i);
  }
  addEditLink() {
    this.editNewLinks.push({ url: '', label: '' });
  }
  removeEditNewLink(i: number) {
    this.editNewLinks = this.editNewLinks.filter((_, idx) => idx !== i);
  }

  // ── Создание события ─────────────────────────────────────────────────────

  create() {
    if (!this.form.title) {
      this.error = 'Укажите название';
      return;
    }
    this.error = '';
    this.msg = '';

    this.api
      .post<any>('/events', {
        emoji: this.form.emoji || null,
        title: this.form.title,
        description: this.form.description || null,
        event_time: this.form.event_time || null,
        points: this.form.points || 0,
      })
      .subscribe({
        next: (created: any) => {
          const id = created.id;
          const tasks: Promise<void>[] = [];

          this.formLinks
            .filter((l) => l.url.trim())
            .forEach((l) => {
              tasks.push(
                this.api
                  .post(`/events/${id}/youtube`, {
                    url: l.url.trim(),
                    label: l.label.trim() || null,
                  })
                  .toPromise()
                  .then(() => {}),
              );
            });

          Promise.allSettled(tasks).then(() => {
            this.msg = 'Событие создано';
            this.showCreateForm = false;
            this.resetForm();
            this.load();
          });
        },
        error: (e: any) => (this.error = e.error?.error || 'Ошибка создания'),
      });
  }

  resetForm() {
    this.form = {
      emoji: '',
      title: '',
      description: '',
      event_time: '',
      points: 0,
    };
    this.formLinks = [];
    this.showFormEmojiPicker = false;
  }

  // ── Редактирование события ──────────────────────────────────────────────

  startEdit(c: EventItem) {
    this.editItem = {
      ...c,
      event_time: this.toDatetimeLocal(c.event_time),
      youtube_links: [...(c.youtube_links || [])],
    };
    this.editNewLinks = [];
    this.showEditEmojiPicker = false;
  }

  private toDatetimeLocal(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  saveEdit() {
    this.api
      .put(`/events/${this.editItem.id}`, {
        emoji: this.editItem.emoji || null,
        title: this.editItem.title,
        description: this.editItem.description,
        event_time: this.editItem.event_time || null,
        points: this.editItem.points ?? 0,
      })
      .subscribe({
        next: () => {
          const id = this.editItem.id;
          const tasks: Promise<void>[] = [];

          this.editNewLinks
            .filter((l) => l.url.trim())
            .forEach((l) => {
              tasks.push(
                this.api
                  .post(`/events/${id}/youtube`, {
                    url: l.url.trim(),
                    label: l.label.trim() || null,
                  })
                  .toPromise()
                  .then(() => {}),
              );
            });

          Promise.allSettled(tasks).then(() => {
            this.msg = 'Сохранено';
            this.editItem = null;
            this.editNewLinks = [];
            this.load();
          });
        },
        error: (e: any) => (this.error = e.error?.error || 'Ошибка сохранения'),
      });
  }

  deleteYoutubeLink(eventId: number, linkId: number) {
    if (!confirm('Удалить ссылку?')) return;
    this.api.delete(`/events/${eventId}/youtube/${linkId}`).subscribe({
      next: () => {
        this.msg = 'Ссылка удалена';
        if (this.editItem)
          this.editItem.youtube_links = this.editItem.youtube_links.filter(
            (l: any) => l.id !== linkId,
          );
        this.load();
      },
      error: (e: any) =>
        (this.error = e.error?.error || 'Ошибка удаления ссылки'),
    });
  }

  remove(id: number) {
    if (!confirm('Удалить событие? Начисленные за него баллы будут отменены.'))
      return;
    this.api.delete(`/events/${id}`).subscribe({
      next: () => {
        this.msg = 'Событие удалено';
        this.load();
      },
      error: (e: any) => (this.error = e.error?.error || 'Ошибка удаления'),
    });
  }

  // ── Победители ───────────────────────────────────────────────────────────

  isWinnerPickerOpen(c: EventItem): boolean {
    return this.winnerPickerOpenFor.has(c.id);
  }

  openWinnerPicker(c: EventItem) {
    c._winnerSelection = new Set(c.winners.map((w) => w.house_id));
    this.winnerPickerOpenFor.add(c.id);
  }

  closeWinnerPicker(c: EventItem) {
    this.winnerPickerOpenFor.delete(c.id);
    delete c._winnerSelection;
  }

  toggleHouseSelection(c: EventItem, houseId: number) {
    if (!c._winnerSelection) c._winnerSelection = new Set();
    if (c._winnerSelection.has(houseId)) {
      c._winnerSelection.delete(houseId);
    } else {
      c._winnerSelection.add(houseId);
    }
  }

  isHouseSelected(c: EventItem, houseId: number): boolean {
    return !!c._winnerSelection?.has(houseId);
  }

  confirmWinners(c: EventItem) {
    const houseIds = Array.from(c._winnerSelection || []);
    if (!houseIds.length) {
      this.error = 'Выберите хотя бы один домик-победитель';
      return;
    }
    this.error = '';
    this.api
      .put<any>(`/events/${c.id}/winners`, { house_ids: houseIds })
      .subscribe({
        next: (updated) => {
          Object.assign(c, updated);
          this.closeWinnerPicker(c);
          this.msg = 'Победители подтверждены, баллы начислены';
        },
        error: (e: any) =>
          (this.error = e.error?.error || 'Ошибка подтверждения победителей'),
      });
  }

  removeWinner(c: EventItem, houseId: number) {
    if (
      !confirm(
        'Убрать этот домик из победителей? Начисленные баллы будут отменены.',
      )
    )
      return;
    this.api.delete(`/events/${c.id}/winners/${houseId}`).subscribe({
      next: () => {
        c.winners = c.winners.filter((w) => w.house_id !== houseId);
        this.msg = 'Победитель убран';
      },
      error: (e: any) =>
        (this.error = e.error?.error || 'Ошибка удаления победителя'),
    });
  }

  clearAllWinners(c: EventItem) {
    if (
      !confirm(
        'Снять всех победителей события? Все начисленные баллы будут отменены.',
      )
    )
      return;
    this.api.delete(`/events/${c.id}/winners`).subscribe({
      next: () => {
        c.winners = [];
        c.finished_at = null;
        c.status =
          c.event_time && new Date(c.event_time).getTime() <= Date.now()
            ? 'идёт'
            : 'будет';
        this.msg = 'Победители сняты';
      },
      error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
    });
  }
}

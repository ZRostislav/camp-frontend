import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { IconComponent } from '../../shared/icon.component';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';

interface Entry {
  id: number;
  participant_id: number;
  last_name: string;
  first_name: string;
  house_id: number;
  house_name: string;
  status: string;
  marked_by_name: string | null;
  marked_at: string | null;
}

interface Rollcall {
  id: number;
  title: string;
  date: string;
  house_id: number | null;
  house_name: string | null;
  status: string; // 'активна' | 'завершена'
  minutes_left: number;
  entries_count?: number;
  entries?: Entry[];
}

@Component({
  selector: 'app-rollcalls',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, MediaUrlPipe],
  templateUrl: './rollcalls.component.html',
})
export class RollcallsComponent implements OnInit, OnDestroy {
  rollcalls: Rollcall[] = [];
  houses: any[] = [];
  selected: Rollcall | null = null;
  selectedId: number | null = null;

  campColor = '#F59E0B';

  houseAttendanceEnabled = true;
  houseAttendanceValue = 0;

  filterDate = this.todayStr();
  filterHouseId: any = '';

  createForm: any = { title: '', date: this.todayStr() };
  showCreateForm = false;

  statuses = ['был', 'опоздал', 'не был', 'не учитывать'];

  /** Визуальный конфиг статуса отметки: иконка, цвет, фон (как на бейджах баллов). */
  statusConfig: Record<string, { icon: string; color: string; bg: string }> = {
    был: { icon: 'circle-check', color: '#16A34A', bg: '#DCFCE7' },
    опоздал: { icon: 'clock', color: '#D97706', bg: '#FEF3C7' },
    'не был': { icon: 'circle-x', color: '#DC2626', bg: '#FEE2E2' },
    'не учитывать': { icon: 'circle-minus', color: '#A8A29E', bg: '#F5F5F0' },
  };

  error = '';
  msg = '';

  // Настройки баллов — для отображения подсказки
  attendanceEnabled = false;
  attendanceValue = 0;
  lateEnabled = false;
  lateValue = 0;

  // Настройки штрафа домику за опоздавших
  housePenaltyEnabled = false;
  housePenaltyThreshold = 0;
  housePenaltyValue = 0;

  // Статус по каждому домику в рамках выбранной переклички
  // (подтверждено ли посещение, выдан ли штраф) — с бэкенда,
  // GET /rollcalls/:id/houses/:houseId/status. Ключ — houseId.
  houseStatuses: Record<number, any> = {};

  private timer: any;
  private listTimer: any;
  private _lastRefresh = 0;

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
    this.api
      .get('/houses')
      .subscribe({ next: (d: any) => (this.houses = d), error: () => {} });
    this.api.get('/settings').subscribe({
      next: (d: any) => {
        this.attendanceEnabled = d['attendance_points_enabled'] === true;
        this.attendanceValue = d['attendance_points_value'] ?? 0;
        this.lateEnabled = d['late_points_enabled'] === true;
        this.lateValue = d['late_points_value'] ?? 0;

        this.houseAttendanceEnabled = d['house_points_enabled'] === true;
        this.houseAttendanceValue = d['house_attendance_points_value'] ?? 0;

        this.housePenaltyEnabled = d['house_late_penalty_enabled'] === true;
        this.housePenaltyThreshold =
          d['house_late_penalty_threshold_percent'] ?? 0;
        this.housePenaltyValue = d['house_late_penalty_points'] ?? 0;
      },
      error: () => {},
    });
    // Адаптивный polling: 3 сек для активной переклички, 15 сек для завершённой.
    this.timer = setInterval(() => {
      if (!this.selectedId) return;
      const isActive = this.selected?.status === 'активна';
      const now = Date.now();
      const elapsed = now - (this._lastRefresh ?? 0);
      const interval = isActive ? 3000 : 15000;
      if (elapsed >= interval) {
        this._lastRefresh = now;
        this.refreshSelected();
      }
    }, 1000);

    // Раз в 10 секунд обновляем список переклички на вкладках (могла появиться
    // новая или завершиться активная).
    this.listTimer = setInterval(() => {
      this.refreshList();
    }, 10000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.listTimer) clearInterval(this.listTimer);
  }

  todayStr(): string {
    return new Date().toISOString().slice(0, 10);
  }

  get campColorBg(): string {
    const num = parseInt(this.campColor.replace('#', ''), 16);
    return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},0.1)`;
  }

  initials(e: Entry): string {
    const l = (e.last_name ?? '').charAt(0).toUpperCase();
    const f = (e.first_name ?? '').charAt(0).toUpperCase();
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

  // Бэкенд может вернуть дату как полный ISO timestamp
  // (например "2026-06-15T21:00:00.000Z"), а <input type="date">
  // требует строго "yyyy-MM-dd" — нормализуем перед записью в модель.
  toDateStr(value: string): string {
    if (!value) return this.todayStr();
    return value.slice(0, 10);
  }

  shiftDay(delta: number) {
    const d = new Date(this.filterDate);
    d.setDate(d.getDate() + delta);
    this.filterDate = d.toISOString().slice(0, 10);
    this.load();
  }

  load() {
    const params: any = {};
    if (this.filterDate) params['date'] = this.filterDate;
    this.api.get('/rollcalls', params).subscribe({
      next: (d: any) => {
        this.rollcalls = d.map((r: Rollcall) => ({
          ...r,
          date: this.toDateStr(r.date),
        }));
        // Если ранее выбранная перекличка осталась в списке — обновим её данные,
        // иначе по умолчанию выбираем первую активную (или первую вообще).
        if (
          this.selectedId &&
          this.rollcalls.some((r) => r.id === this.selectedId)
        ) {
          this.refreshSelected();
        } else if (this.rollcalls.length) {
          const active = this.rollcalls.find((r) => r.status === 'активна');
          this.selectTab(active || this.rollcalls[0]);
        } else {
          this.selected = null;
          this.selectedId = null;
        }
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  // Тихое обновление вкладок (без смены выбранной переклички).
  refreshList() {
    const params: any = {};
    if (this.filterDate) params['date'] = this.filterDate;
    this.api.get('/rollcalls', params).subscribe({
      next: (d: any) => {
        this.rollcalls = d.map((r: Rollcall) => ({
          ...r,
          date: this.toDateStr(r.date),
        }));
      },
      error: () => {},
    });
  }

  selectTab(r: Rollcall) {
    this.selectedId = r.id;
    this._lastRefresh = 0; // сразу запустить обновление при переключении вкладки
    this.error = '';
    this.api.get(`/rollcalls/${r.id}`).subscribe({
      next: (d: any) => {
        this.selected = { ...d, date: this.toDateStr(d.date) };
        this.houseStatuses = {};
        this.loadHouseStatuses();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  refreshSelected() {
    if (!this.selectedId) return;
    this.api.get(`/rollcalls/${this.selectedId}`).subscribe({
      next: (d: any) => {
        this.selected = { ...d, date: this.toDateStr(d.date) };
        this.loadHouseStatuses();
      },
      error: (e: any) => {
        // Перекличка удалена или не существует — сбрасываем выбор
        if (e.status === 404) {
          this.selectedId = null;
          this.selected = null;
          this.load();
        }
      },
    });
  }

  // Подгружает статус (подтверждение / штраф) для каждого домика,
  // встречающегося среди записей переклички — чтобы дизейблить кнопки
  // "Подтвердить домик" / "Штраф" после того, как действие уже выполнено.
  loadHouseStatuses() {
    if (!this.selected?.entries) return;
    const houseIds = Array.from(
      new Set(
        this.selected.entries
          .map((e) => e.house_id)
          .filter((id): id is number => !!id),
      ),
    );
    houseIds.forEach((houseId) => {
      this.api
        .get(`/rollcalls/${this.selected!.id}/houses/${houseId}/status`)
        .subscribe({
          next: (d: any) => (this.houseStatuses[houseId] = d),
          error: () => {},
        });
    });
  }

  /** Сводка по всем статусам в рамках выбранной переклички (для карточек-счётчиков). */
  get summaryCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const s of this.statuses) counts[s] = 0;
    for (const e of this.selected?.entries ?? []) {
      if (counts[e.status] !== undefined) counts[e.status]++;
    }
    return counts;
  }

  groupedEntries(): { houseId: number; houseName: string; entries: Entry[] }[] {
    if (!this.selected?.entries) return [];
    const map = new Map<
      number,
      { houseId: number; houseName: string; entries: Entry[] }
    >();
    for (const e of this.selected.entries) {
      if (
        this.filterHouseId &&
        String(e.house_id) !== String(this.filterHouseId)
      )
        continue;
      if (!map.has(e.house_id)) {
        map.set(e.house_id, {
          houseId: e.house_id,
          houseName: e.house_name,
          entries: [],
        });
      }
      map.get(e.house_id)!.entries.push(e);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.houseName.localeCompare(b.houseName),
    );
  }

  isLocked(): boolean {
    return !this.selected || this.selected.status !== 'активна';
  }

  /** Сколько участников в группе домика уже отмечено (любым статусом, кроме отсутствия отметки). */
  markedCount(group: { entries: Entry[] }): number {
    return group.entries.filter((e) => !!e.status).length;
  }

  create() {
    if (!this.createForm.title) {
      this.error = 'Укажите название';
      return;
    }
    const body = {
      title: this.createForm.title,
      date: this.createForm.date || this.todayStr(),
    };
    this.api.post('/rollcalls', body).subscribe({
      next: (created: any) => {
        this.msg = 'Перекличка создана';
        this.createForm = { title: '', date: this.todayStr() };
        this.showCreateForm = false;
        // Переключаем фильтр на дату новой переклички и сразу выбираем её.
        this.filterDate = this.toDateStr(created.date);
        this.selectedId = created.id;
        this._lastRefresh = 0;
        const params: any = { date: this.filterDate };
        this.api.get('/rollcalls', params).subscribe({
          next: (d: any) => {
            this.rollcalls = d.map((r: Rollcall) => ({
              ...r,
              date: this.toDateStr(r.date),
            }));
            this.selectTab({ ...created, date: this.toDateStr(created.date) });
          },
          error: (e) => (this.error = e.error?.error || 'Ошибка'),
        });
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  confirmHouse(houseId: number) {
    if (!this.selected || this.isLocked() || this.isHouseConfirmed(houseId))
      return;
    this.api
      .post(`/rollcalls/${this.selected.id}/confirm-house/${houseId}`, {})
      .subscribe({
        next: () => {
          this.msg = 'Домик подтвержден, баллы начислены';
          this.refreshSelected();
        },
        error: (e) => {
          this.error = e.error?.error || 'Ошибка';
          this.refreshSelected();
        },
      });
  }

  // % опоздавших в группе домика (для мгновенного отображения, пока не
  // подгрузился авторитетный статус с бэкенда)
  latePercent(group: { entries: Entry[] }): number {
    const total = group.entries.length;
    if (!total) return 0;
    const late = group.entries.filter((e) => e.status === 'опоздал').length;
    return Math.round((late / total) * 1000) / 10;
  }

  // Уже подтверждено / уже оштрафовано — берём из авторитетного статуса
  // с бэкенда (GET /rollcalls/:id/houses/:houseId/status). Пока статус не
  // подгрузился, считаем, что действие ещё не выполнено.
  isHouseConfirmed(houseId: number): boolean {
    return !!this.houseStatuses[houseId]?.attendanceConfirmation?.confirmed;
  }

  isHousePenalized(houseId: number): boolean {
    return !!this.houseStatuses[houseId]?.latePenalty?.alreadyApplied;
  }

  // Доступность штрафа — тоже из бэкенда (учитывает порог %, отметку всех
  // детей и то, что штраф ещё не выдан). Пока статус не загружен — false,
  // чтобы кнопка не мигала активной до проверки.
  canPenalize(houseId: number): boolean {
    const s = this.houseStatuses[houseId]?.latePenalty;
    return !!s?.eligible && !s?.alreadyApplied;
  }

  // Штраф можно выдать и после завершения переклички (бэкенд это разрешает),
  // в отличие от подтверждения, которое требует активной переклички.
  penalizeHouse(houseId: number) {
    if (!this.selected || this.isHousePenalized(houseId)) return;
    if (
      !confirm(
        `Выдать домику штраф -${this.housePenaltyValue} баллов за опоздавших?`,
      )
    )
      return;
    this.api
      .post(`/rollcalls/${this.selected.id}/penalize-house/${houseId}`, {})
      .subscribe({
        next: (d: any) => {
          this.msg = d.already ? 'Штраф уже был выдан ранее' : 'Штраф выдан';
          this.refreshSelected();
        },
        error: (e) => {
          this.error = e.error?.error || 'Ошибка';
          this.refreshSelected();
        },
      });
  }

  mark(participantId: number, status: string) {
    if (!this.selected || this.isLocked()) return;
    this.api
      .put(`/rollcalls/${this.selected.id}/entries/${participantId}`, {
        status,
      })
      .subscribe({
        next: () => {
          this.msg = 'Отмечено';
          this.refreshSelected();
        },
        error: (e) => {
          this.error = e.error?.error || 'Ошибка';
          this.refreshSelected(); // подхватить блокировку, если перекличка успела завершиться
        },
      });
  }

  complete(id: number) {
    if (!confirm('Завершить перекличку досрочно?')) return;
    this.api.post(`/rollcalls/${id}/complete`, {}).subscribe({
      next: () => {
        this.msg = 'Перекличка завершена';
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  remove(id: number) {
    if (!confirm('Удалить перекличку?')) return;
    this.api.delete(`/rollcalls/${id}`).subscribe({
      next: () => {
        this.msg = 'Удалена';
        this.selected = null;
        this.selectedId = null;
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }
}

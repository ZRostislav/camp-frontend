import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';
import { IconComponent } from '../../shared/icon.component';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner.component';

interface ColorPreset {
  name: string;
  color: string;
  emoji: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MediaUrlPipe,
    IconComponent,
    LoadingSpinnerComponent,
    PickerComponent,
  ],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit, OnDestroy {
  // ── флаги UI ────────────────────────────────────────────────────────────
  loading = true;
  error = '';
  msg = '';
  logoUploading = false;
  saving = false;
  saved = false;
  showEmojiPicker = false;

  readonly presets: ColorPreset[] = [
    { name: 'Солнце', color: '#F59E0B', emoji: '☀️' },
    { name: 'Лес', color: '#16A34A', emoji: '🌲' },
    { name: 'Небо', color: '#0EA5E9', emoji: '🌊' },
    { name: 'Закат', color: '#F97316', emoji: '🔥' },
    { name: 'Ягода', color: '#8B5CF6', emoji: '🫐' },
    { name: 'Роза', color: '#E11D48', emoji: '🌹' },
  ];

  // ── баллы участников ────────────────────────────────────────────────────
  participantPointsEnabled = true;

  // ── баллы за посещение ──────────────────────────────────────────────────
  attendanceEnabled = false;
  attendanceValue = 5;

  // ── баллы за опоздание ──────────────────────────────────────────────────
  lateEnabled = false;
  lateValue = -2;

  // ── баллы домику за перекличку ────────────────────────────────────────
  houseAttendanceEnabled = false;
  houseAttendanceValue = 0;

  // ── штраф домику за опоздавших ──────────────────────────────────────────
  housePenaltyEnabled = false;
  housePenaltyThreshold = 50;
  housePenaltyValue = 0;

  // ── информация о заезде ─────────────────────────────────────────────────
  campName = '';
  campEmoji = '';
  campLogoPath: string | null = null;
  campOrganization = '';
  campColor = '#F59E0B';
  campDateStart = '';
  campDateEnd = '';

  /**
   * Оригинальный цвет, загруженный с бэка.
   * Используется для отката если пользователь ушёл без сохранения.
   */
  private _savedColor = '#F59E0B';

  /** Флаг: пользователь нажал «Сохранить» в текущей сессии компонента */
  private _campInfoSaved = false;

  /**
   * Снэпшот всех редактируемых полей сразу после loadSettings().
   * Используется кнопкой «Отменить изменения» — откатывает форму
   * к состоянию при открытии страницы (без повторного запроса к серверу).
   */
  private _initialSnapshot: Record<string, unknown> = {};

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private settingsService: SettingsService,
  ) {}

  ngOnInit() {
    this.loadSettings();
  }

  /**
   * При уходе со страницы без сохранения откатываем цвет обратно.
   * Другие поля (название, организация, эмодзи, даты) не трогаем —
   * они визуально менее критичны и не меняют тему сайдбара.
   */
  ngOnDestroy() {
    if (!this._campInfoSaved) {
      this.settingsService.patch({ camp_color: this._savedColor });
    }
  }

  loadSettings() {
    this.loading = true;
    this.settingsService.get().subscribe({
      next: (d: any) => {
        this.participantPointsEnabled =
          d['participant_points_enabled'] === true;
        this.attendanceEnabled = d['attendance_points_enabled'] === true;
        this.attendanceValue = d['attendance_points_value'] ?? 5;
        this.lateEnabled = d['late_points_enabled'] === true;
        this.lateValue = d['late_points_value'] ?? -2;
        this.houseAttendanceEnabled = d['house_points_enabled'] === true;
        this.houseAttendanceValue = d['house_attendance_points_value'] ?? 0;
        this.housePenaltyEnabled = d['house_late_penalty_enabled'] === true;
        this.housePenaltyThreshold =
          d['house_late_penalty_threshold_percent'] ?? 50;
        this.housePenaltyValue = d['house_late_penalty_points'] ?? 0;
        this.campName = d['camp_name'] ?? '';
        this.campEmoji = d['camp_emoji'] ?? '';
        this.campLogoPath = d['camp_logo_path'] ?? null;
        this.campOrganization = d['camp_organization'] ?? '';
        this.campColor = d['camp_color'] ?? '#F59E0B';
        this.campDateStart = d['camp_date_start']
          ? d['camp_date_start'].slice(0, 10)
          : '';
        this.campDateEnd = d['camp_date_end']
          ? d['camp_date_end'].slice(0, 10)
          : '';

        // Запоминаем оригинальный цвет для возможного отката
        this._savedColor = this.campColor;
        this.loading = false;

        // Снэпшот всех полей формы — для кнопки «Отменить изменения»
        this._initialSnapshot = this.captureSnapshot();
      },
      error: (e: any) => {
        this.error = e.error?.error || 'Ошибка загрузки настроек';
        this.loading = false;
      },
    });
  }

  // ── живое обновление кэша при изменении полей ───────────────────────────

  onColorChange(color: string): void {
    this.settingsService.patch({ camp_color: color });
  }

  selectPreset(color: string): void {
    this.campColor = color;
    this.onColorChange(color);
  }

  onCampNameChange(name: string): void {
    this.settingsService.patch({ camp_name: name });
  }

  onOrganizationChange(org: string): void {
    this.settingsService.patch({ camp_organization: org });
  }

  onEmojiChange(emoji: string): void {
    this.settingsService.patch({ camp_emoji: emoji });
  }

  onDateStartChange(date: string): void {
    this.settingsService.patch({ camp_date_start: date });
  }

  onDateEndChange(date: string): void {
    this.settingsService.patch({ camp_date_end: date });
  }

  get campColorBg(): string {
    return this.hexToRgba(this.campColor, 0.08);
  }

  get campColorLight(): string {
    return this.hexToRgba(this.campColor, 0.18);
  }

  isPresetActive(color: string): boolean {
    return this.campColor?.toLowerCase() === color.toLowerCase();
  }

  // ── модалка выбора эмодзи лагеря ─────────────────────────────────────────

  onCampEmojiSelect(event: any): void {
    const emoji = event.emoji?.native;
    if (emoji) {
      this.campEmoji = emoji;
      this.onEmojiChange(emoji);
    }
    this.showEmojiPicker = false;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showEmojiPicker) this.showEmojiPicker = false;
  }

  // ── снэпшот формы и откат несохранённых изменений ────────────────────────

  /** Собирает текущие значения всех редактируемых полей в один объект. */
  private captureSnapshot(): Record<string, unknown> {
    return {
      participantPointsEnabled: this.participantPointsEnabled,
      attendanceEnabled: this.attendanceEnabled,
      attendanceValue: this.attendanceValue,
      lateEnabled: this.lateEnabled,
      lateValue: this.lateValue,
      houseAttendanceEnabled: this.houseAttendanceEnabled,
      houseAttendanceValue: this.houseAttendanceValue,
      housePenaltyEnabled: this.housePenaltyEnabled,
      housePenaltyThreshold: this.housePenaltyThreshold,
      housePenaltyValue: this.housePenaltyValue,
      campName: this.campName,
      campEmoji: this.campEmoji,
      campLogoPath: this.campLogoPath,
      campOrganization: this.campOrganization,
      campColor: this.campColor,
      campDateStart: this.campDateStart,
      campDateEnd: this.campDateEnd,
    };
  }

  /** true если в форме есть несохранённые изменения относительно снэпшота. */
  get hasUnsavedChanges(): boolean {
    const current = this.captureSnapshot();
    return Object.keys(this._initialSnapshot).some(
      (key) => this._initialSnapshot[key] !== current[key],
    );
  }

  /**
   * Откатывает все поля формы к состоянию, зафиксированному при загрузке
   * страницы (без повторного запроса к серверу — снэпшот уже в памяти).
   * Также возвращает live-превью (сайдбар/тема) к исходным значениям.
   */
  resetAll(): void {
    const s = this._initialSnapshot;
    this.participantPointsEnabled = s['participantPointsEnabled'] as boolean;
    this.attendanceEnabled = s['attendanceEnabled'] as boolean;
    this.attendanceValue = s['attendanceValue'] as number;
    this.lateEnabled = s['lateEnabled'] as boolean;
    this.lateValue = s['lateValue'] as number;
    this.houseAttendanceEnabled = s['houseAttendanceEnabled'] as boolean;
    this.houseAttendanceValue = s['houseAttendanceValue'] as number;
    this.housePenaltyEnabled = s['housePenaltyEnabled'] as boolean;
    this.housePenaltyThreshold = s['housePenaltyThreshold'] as number;
    this.housePenaltyValue = s['housePenaltyValue'] as number;
    this.campName = s['campName'] as string;
    this.campEmoji = s['campEmoji'] as string;
    this.campLogoPath = s['campLogoPath'] as string | null;
    this.campOrganization = s['campOrganization'] as string;
    this.campColor = s['campColor'] as string;
    this.campDateStart = s['campDateStart'] as string;
    this.campDateEnd = s['campDateEnd'] as string;

    this.error = '';
    // Возвращаем live-превью (сайдбар и т.п.) к исходным значениям —
    // patch() мгновенно обновит то, что уже успело подсветиться вживую.
    this.settingsService.patch({
      camp_name: this.campName,
      camp_organization: this.campOrganization,
      camp_emoji: this.campEmoji,
      camp_color: this.campColor,
      camp_date_start: this.campDateStart,
      camp_date_end: this.campDateEnd,
    });

    this.msg = 'Изменения отменены';
    setTimeout(() => (this.msg = ''), 2000);
  }

  // ── сохранить всё разом ──────────────────────────────────────────────────
  saveAll() {
    this.error = '';
    this.msg = '';
    this.saving = true;
    this.saved = false;

    forkJoin({
      camp: this.api
        .put('/settings/camp', {
          name: this.campName || null,
          emoji: this.campEmoji || null,
          organization: this.campOrganization || null,
          color: this.campColor || null,
          dateStart: this.campDateStart || null,
          dateEnd: this.campDateEnd || null,
        })
        .pipe(catchError((e) => of({ __error: e }))),
      participantPoints: this.api
        .put('/settings/participant-points', {
          enabled: this.participantPointsEnabled,
        })
        .pipe(catchError((e) => of({ __error: e }))),
      attendance: this.api
        .put('/settings/attendance-points', {
          enabled: this.attendanceEnabled,
          value: Number(this.attendanceValue),
        })
        .pipe(catchError((e) => of({ __error: e }))),
      late: this.api
        .put('/settings/late-points', {
          enabled: this.lateEnabled,
          value: Number(this.lateValue),
        })
        .pipe(catchError((e) => of({ __error: e }))),
      houseAttendance: this.api
        .put('/settings/house-points', {
          enabled: this.houseAttendanceEnabled,
          value: Number(this.houseAttendanceValue),
        })
        .pipe(catchError((e) => of({ __error: e }))),
      housePenalty: this.api
        .put('/settings/house-late-penalty', {
          enabled: this.housePenaltyEnabled,
          thresholdPercent: Number(this.housePenaltyThreshold),
          points: Number(this.housePenaltyValue),
        })
        .pipe(catchError((e) => of({ __error: e }))),
    }).subscribe((results) => {
      this.saving = false;

      const failed = Object.entries(results).filter(
        ([, v]: [string, any]) => v && v.__error,
      );

      if (failed.length > 0) {
        const firstError = (failed[0][1] as any).__error;
        this.error =
          firstError?.error?.error ||
          `Не удалось сохранить: ${failed.map(([k]) => k).join(', ')}`;
        return;
      }

      // Помечаем что сохранение произошло — ngOnDestroy не будет откатывать цвет
      this._campInfoSaved = true;
      this._savedColor = this.campColor;

      // invalidate() сбрасывает только in-memory.
      // В localStorage лежит полный объект с бэка (записан при loadSettings),
      // patch() смержит поверх него только camp-поля — остальные останутся.
      this.settingsService.invalidate();
      this.settingsService.patch({
        camp_name: this.campName,
        camp_organization: this.campOrganization,
        camp_emoji: this.campEmoji,
        camp_color: this.campColor,
        camp_date_start: this.campDateStart,
        camp_date_end: this.campDateEnd,
      });

      this.saved = true;
      this.ok('Все настройки сохранены');
      setTimeout(() => (this.saved = false), 2000);

      // Новая точка отката — теперь «отменить» откатывает к только что
      // сохранённому состоянию, а не к тому, что было при открытии страницы.
      this._initialSnapshot = this.captureSnapshot();
    });
  }

  // ── логотип лагеря ──────────────────────────────────────────────────────
  onLogoChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const fd = new FormData();
    fd.append('logo', input.files[0]);
    this.logoUploading = true;
    this.api.postFormData('/settings/camp/logo', fd).subscribe({
      next: (d: any) => {
        this.campLogoPath = d['camp_logo_path'] ?? null;
        this.campEmoji = d['camp_emoji'] ?? '';
        this.logoUploading = false;
        this.settingsService.patch({
          camp_logo_path: this.campLogoPath ?? undefined,
          camp_emoji: this.campEmoji,
        });
        this.ok('Логотип загружен');
        this._initialSnapshot = this.captureSnapshot();
      },
      error: (e: any) => {
        this.error = e.error?.error || 'Ошибка загрузки';
        this.logoUploading = false;
      },
    });
    input.value = '';
  }

  deleteLogo() {
    if (!confirm('Удалить логотип?')) return;
    this.api.delete('/settings/camp/logo').subscribe({
      next: () => {
        this.campLogoPath = null;
        this.settingsService.patch({ camp_logo_path: undefined });
        this.ok('Логотип удалён');
        this._initialSnapshot = this.captureSnapshot();
      },
      error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private ok(text: string) {
    this.error = '';
    this.msg = text;
    setTimeout(() => (this.msg = ''), 3000);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const num = parseInt((hex || '#F59E0B').replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaUrlPipe],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit, OnDestroy {
  // ── флаги UI ────────────────────────────────────────────────────────────
  error = '';
  msg = '';
  logoUploading = false;

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
      },
      error: (e: any) =>
        (this.error = e.error?.error || 'Ошибка загрузки настроек'),
    });
  }

  // ── живое обновление кэша при изменении полей ───────────────────────────

  onColorChange(color: string): void {
    this.settingsService.patch({ camp_color: color });
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

  // ── баллы участников ────────────────────────────────────────────────────
  saveParticipantPoints() {
    this.api
      .put('/settings/participant-points', {
        enabled: this.participantPointsEnabled,
      })
      .subscribe({
        next: () => this.ok('Сохранено'),
        error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
      });
  }

  // ── баллы за посещение ──────────────────────────────────────────────────
  saveAttendancePoints() {
    this.api
      .put('/settings/attendance-points', {
        enabled: this.attendanceEnabled,
        value: Number(this.attendanceValue),
      })
      .subscribe({
        next: () => this.ok('Сохранено'),
        error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
      });
  }

  // ── баллы за опоздание ──────────────────────────────────────────────────
  saveLatePoints() {
    this.api
      .put('/settings/late-points', {
        enabled: this.lateEnabled,
        value: Number(this.lateValue),
      })
      .subscribe({
        next: () => this.ok('Сохранено'),
        error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
      });
  }

  // ── баллы домику за перекличку ──────────────────────────────────────────
  saveHouseAttendancePoints() {
    this.api
      .put('/settings/house-points', {
        enabled: this.houseAttendanceEnabled,
        value: Number(this.houseAttendanceValue),
      })
      .subscribe({
        next: () => this.ok('Сохранено'),
        error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
      });
  }

  // ── штраф домику за опоздавших ──────────────────────────────────────────
  saveHouseLatePenalty() {
    this.api
      .put('/settings/house-late-penalty', {
        enabled: this.housePenaltyEnabled,
        thresholdPercent: Number(this.housePenaltyThreshold),
        points: Number(this.housePenaltyValue),
      })
      .subscribe({
        next: () => this.ok('Сохранено'),
        error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
      });
  }

  // ── информация о заезде ─────────────────────────────────────────────────
  saveCampInfo() {
    this.api
      .put('/settings/camp', {
        name: this.campName || null,
        emoji: this.campEmoji || null,
        organization: this.campOrganization || null,
        color: this.campColor || null,
        dateStart: this.campDateStart || null,
        dateEnd: this.campDateEnd || null,
      })
      .subscribe({
        next: () => {
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
          this.ok('Сохранено');
        },
        error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
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
}

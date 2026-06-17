import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
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

  // ── баллы домику за перекличку (подтверждение посещения) ────────────────
  houseAttendanceEnabled = false;
  houseAttendanceValue = 0;

  // ── штраф домику за опоздавших ───────────────────────────────────────────
  housePenaltyEnabled = false;
  housePenaltyThreshold = 50;
  housePenaltyValue = 0;

  // ── информация о заезде ─────────────────────────────────────────────────
  campName = '';
  campEmoji = '';
  campLogoPath: string | null = null;
  campOrganization = '';
  campColor = '#4f7ef8';
  campDateStart = '';
  campDateEnd = '';

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.api.get('/settings').subscribe({
      next: (d: any) => {
        this.participantPointsEnabled = d['participant_points_enabled'] === true;
        this.attendanceEnabled        = d['attendance_points_enabled'] === true;
        this.attendanceValue          = d['attendance_points_value'] ?? 5;
        this.lateEnabled              = d['late_points_enabled'] === true;
        this.lateValue                = d['late_points_value'] ?? -2;
        this.houseAttendanceEnabled   = d['house_points_enabled'] === true;
        this.houseAttendanceValue     = d['house_attendance_points_value'] ?? 0;
        this.housePenaltyEnabled      = d['house_late_penalty_enabled'] === true;
        this.housePenaltyThreshold    = d['house_late_penalty_threshold_percent'] ?? 50;
        this.housePenaltyValue        = d['house_late_penalty_points'] ?? 0;
        this.campName                 = d['camp_name'] ?? '';
        this.campEmoji                = d['camp_emoji'] ?? '';
        this.campLogoPath             = d['camp_logo_path'] ?? null;
        this.campOrganization         = d['camp_organization'] ?? '';
        this.campColor                = d['camp_color'] ?? '#4f7ef8';
        this.campDateStart            = d['camp_date_start'] ? d['camp_date_start'].slice(0, 10) : '';
        this.campDateEnd              = d['camp_date_end']   ? d['camp_date_end'].slice(0, 10)   : '';
      },
      error: (e: any) => (this.error = e.error?.error || 'Ошибка загрузки настроек'),
    });
  }

  // ── баллы участников ────────────────────────────────────────────────────
  saveParticipantPoints() {
    this.api.put('/settings/participant-points', { enabled: this.participantPointsEnabled }).subscribe({
      next: () => this.ok('Сохранено'),
      error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  // ── баллы за посещение ──────────────────────────────────────────────────
  saveAttendancePoints() {
    this.api.put('/settings/attendance-points', {
      enabled: this.attendanceEnabled,
      value: Number(this.attendanceValue),
    }).subscribe({
      next: () => this.ok('Сохранено'),
      error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  // ── баллы за опоздание ──────────────────────────────────────────────────
  saveLatePoints() {
    this.api.put('/settings/late-points', {
      enabled: this.lateEnabled,
      value: Number(this.lateValue),
    }).subscribe({
      next: () => this.ok('Сохранено'),
      error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  // ── баллы домику за перекличку ───────────────────────────────────────────
  saveHouseAttendancePoints() {
    this.api.put('/settings/house-points', {
      enabled: this.houseAttendanceEnabled,
      value: Number(this.houseAttendanceValue),
    }).subscribe({
      next: () => this.ok('Сохранено'),
      error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  // ── штраф домику за опоздавших ───────────────────────────────────────────
  saveHouseLatePenalty() {
    this.api.put('/settings/house-late-penalty', {
      enabled: this.housePenaltyEnabled,
      thresholdPercent: Number(this.housePenaltyThreshold),
      points: Number(this.housePenaltyValue),
    }).subscribe({
      next: () => this.ok('Сохранено'),
      error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  // ── информация о заезде ─────────────────────────────────────────────────
  saveCampInfo() {
    this.api.put('/settings/camp', {
      name:         this.campName         || null,
      emoji:        this.campEmoji        || null,
      organization: this.campOrganization || null,
      color:        this.campColor        || null,
      dateStart:    this.campDateStart    || null,
      dateEnd:      this.campDateEnd      || null,
    }).subscribe({
      next: () => this.ok('Сохранено'),
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
      next: () => { this.campLogoPath = null; this.ok('Логотип удалён'); },
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

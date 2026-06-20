import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './error.component.html',
})
export class ErrorComponent implements OnInit {
  code = '500';
  title = 'Ой, что-то сломалось';
  message = 'Произошла непредвиденная ошибка. Попробуйте обновить страницу.';
  emoji = '⛺';

  campName = '';
  campColor = '#F59E0B';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private settings: SettingsService,
  ) {
    const qp = this.route.snapshot.queryParamMap;
    this.code = qp.get('code') ?? this.code;
    this.title = qp.get('title') ?? this.titleFor(this.code);
    this.message = qp.get('message') ?? this.messageFor(this.code);
    this.emoji = this.emojiFor(this.code);

    // Быстрый старт из кэша, без ожидания HTTP.
    const cached = this.settings.peekCache();
    this.applySettings(cached);
  }

  ngOnInit(): void {
    this.settings.get().subscribe({
      next: (d) => this.applySettings(d),
      error: () => {},
    });
  }

  get campColorBg(): string {
    return this.hexToRgba(this.campColor, 0.1);
  }

  reload(): void {
    window.location.reload();
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  private applySettings(d: Record<string, unknown> | null | undefined): void {
    if (!d) return;
    this.campName = (d['camp_name'] as string) ?? this.campName;
    this.campColor = (d['camp_color'] as string) ?? this.campColor;
  }

  private titleFor(code: string): string {
    switch (code) {
      case '403':
        return 'Сюда нельзя';
      case '404':
        return 'Такой страницы нет';
      case '500':
        return 'Ой, что-то сломалось';
      default:
        return 'Что-то пошло не так';
    }
  }

  private messageFor(code: string): string {
    switch (code) {
      case '403':
        return 'У вас нет прав для просмотра этого раздела.';
      case '404':
        return 'Возможно, страница переехала или была удалена.';
      case '500':
        return 'На сервере что-то пошло не так. Попробуйте ещё раз чуть позже.';
      default:
        return 'Произошла непредвиденная ошибка. Попробуйте обновить страницу.';
    }
  }

  private emojiFor(code: string): string {
    switch (code) {
      case '403':
        return '🔒';
      case '404':
        return '🧭';
      case '500':
        return '🔥';
      default:
        return '⛺';
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
}

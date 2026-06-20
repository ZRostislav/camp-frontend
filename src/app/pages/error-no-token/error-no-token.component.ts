import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-error-no-token',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './error-no-token.component.html',
})
export class ErrorNoTokenComponent implements OnInit {
  campName = '';
  campColor = '#F59E0B';

  constructor(private settings: SettingsService) {
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

  private applySettings(d: Record<string, unknown> | null | undefined): void {
    if (!d) return;
    this.campName = (d['camp_name'] as string) ?? this.campName;
    this.campColor = (d['camp_color'] as string) ?? this.campColor;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
}

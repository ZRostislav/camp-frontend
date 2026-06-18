import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SettingsService, CampSettings } from '../../services/settings.service';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MediaUrlPipe,
    IconComponent,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent implements OnInit, OnDestroy {
  campName = '';
  campOrganization = '';
  campEmoji = '';
  campLogoPath: string | null = null;
  campColor = '#F59E0B';
  campDateStart = '';
  campDateEnd = '';

  mobileMenuOpen = false;

  private liveSub?: Subscription;

  constructor(
    public auth: AuthService,
    private settingsService: SettingsService,
  ) {}

  ngOnInit() {
    // Первичная загрузка: memory → localStorage → HTTP
    this.settingsService.get().subscribe({
      next: (d) => this.applySettings(d),
      error: () => {},
    });

    // Живые обновления — срабатывает при каждом patch() из любого компонента.
    // BehaviorSubject стартует с {} — пропускаем пустой начальный эмит.
    this.liveSub = this.settingsService.live$.subscribe((d) => {
      if (Object.keys(d).length > 0) {
        this.applySettings(d as CampSettings);
      }
    });
  }

  ngOnDestroy() {
    this.liveSub?.unsubscribe();
  }

  private applySettings(d: Partial<CampSettings>): void {
    if (d['camp_name'] != null) this.campName = d['camp_name'] as string;
    if (d['camp_organization'] != null)
      this.campOrganization = d['camp_organization'] as string;
    if (d['camp_emoji'] != null) this.campEmoji = d['camp_emoji'] as string;
    if (d['camp_logo_path'] != null)
      this.campLogoPath = d['camp_logo_path'] as string | null;
    if (d['camp_color'] != null) this.campColor = d['camp_color'] as string;
    const start = d['camp_date_start'] as string | undefined;
    const end = d['camp_date_end'] as string | undefined;
    if (start !== undefined)
      this.campDateStart = start ? start.slice(0, 10) : '';
    if (end !== undefined) this.campDateEnd = end ? end.slice(0, 10) : '';
  }

  getUserInitials(): string {
    const name =
      this.auth.currentUser()?.fullName ||
      this.auth.currentUser()?.full_name ||
      '';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }
}

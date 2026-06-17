import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MediaUrlPipe,
  ],
  templateUrl: './layout.component.html',
})
export class LayoutComponent implements OnInit {
  campName = '';
  campOrganization = '';
  campEmoji = '';
  campLogoPath: string | null = null;
  campColor = '#4f7ef8';
  campDateStart = '';
  campDateEnd = '';

  constructor(
    public auth: AuthService,
    private api: ApiService,
  ) {}

  ngOnInit() {
    this.api.get('/settings').subscribe({
      next: (d: any) => {
        this.campName = d['camp_name'] ?? '';
        this.campOrganization = d['camp_organization'] ?? '';
        this.campEmoji = d['camp_emoji'] ?? '';
        this.campLogoPath = d['camp_logo_path'] ?? null;
        this.campColor = d['camp_color'] ?? '#4f7ef8';
        this.campDateStart = d['camp_date_start']
          ? d['camp_date_start'].slice(0, 10)
          : '';
        this.campDateEnd = d['camp_date_end']
          ? d['camp_date_end'].slice(0, 10)
          : '';
      },
      error: () => {},
    });
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }
}

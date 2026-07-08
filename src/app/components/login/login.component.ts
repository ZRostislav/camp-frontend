import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  mode: 'staff' | 'participant' = 'staff';
  username = '';
  password = '';
  fullName = '';
  accessCodeDigits: string[] = ['', '', '', ''];

  campName = '';
  campOrganization = '';
  campColor = '#F59E0B';

  @ViewChildren('codeCell') codeCells!: QueryList<ElementRef<HTMLInputElement>>;

  error = '';
  loading = false;
  showPassword = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private settings: SettingsService,
  ) {
    if (auth.isLoggedIn) this.router.navigate(['/']);
  }

  ngOnInit() {
    this.settings.get().subscribe({
      next: (d) => {
        this.campName = (d['camp_name'] as string) ?? '';
        this.campOrganization = (d['camp_organization'] as string) ?? '';
        this.campColor = (d['camp_color'] as string) ?? '#F59E0B';
      },
      error: () => {},
    });
  }

  /** Returns a hex color slightly darker than campColor for hover states */
  get campColorHover(): string {
    return this.shadeColor(this.campColor, -15);
  }

  /** Returns the camp color with low opacity for focus rings / light backgrounds */
  get campColorLight(): string {
    return this.hexToRgba(this.campColor, 0.12);
  }

  /** Returns the camp color with very low opacity for light fill backgrounds */
  get campColorBg(): string {
    return this.hexToRgba(this.campColor, 0.08);
  }

  private shadeColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
    const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  get accessCode(): string {
    return this.accessCodeDigits.join('');
  }

  trackByIndex(index: number): number {
    return index;
  }

  onCodeInput(index: number) {
    const value = this.accessCodeDigits[index]?.replace(/\D/g, '').slice(-1);
    this.accessCodeDigits[index] = value;
    if (value && index < 3) this.focusCell(index + 1);
  }

  onCodeKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      if (this.accessCodeDigits[index]) return;
      if (index > 0) {
        event.preventDefault();
        this.focusCell(index - 1);
        this.accessCodeDigits[index - 1] = '';
      }
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusCell(index - 1);
    }
    if (event.key === 'ArrowRight' && index < 3) {
      event.preventDefault();
      this.focusCell(index + 1);
    }
  }

  onCodeFocus(event: FocusEvent) {
    (event.target as HTMLInputElement).select();
  }

  onCodePaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, 4).split('');
    if (!digits.length) return;
    event.preventDefault();
    digits.forEach((d, i) => {
      this.accessCodeDigits[i] = d;
    });
    this.focusCell(Math.min(digits.length, 3), true);
  }

  private focusCell(index: number, selectContent = false) {
    const cell = this.codeCells.get(index)?.nativeElement;
    if (!cell) return;
    cell.focus();
    if (selectContent) cell.select();
  }

  login() {
    this.error = '';
    this.loading = true;
    if (this.mode === 'staff') {
      this.auth.staffLogin(this.username, this.password).subscribe({
        next: () => this.router.navigate(['/']),
        error: (e) => {
          this.error = e.error?.error || 'Ошибка входа';
          this.loading = false;
        },
      });
    } else {
      const { lastName, firstName } = this.splitFullName(this.fullName);
      this.auth
        .participantLogin(lastName, firstName, this.accessCode)
        .subscribe({
          next: () => this.router.navigate(['/']),
          error: (e) => {
            this.error = e.error?.error || 'Ошибка входа';
            this.loading = false;
          },
        });
    }
  }

  private splitFullName(value: string): {
    firstName: string;
    lastName: string;
  } {
    const trimmed = value.trim().replace(/\s+/g, ' ');
    const [lastName = '', ...rest] = trimmed.split(' ');
    return { lastName, firstName: rest.join(' ') };
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  @HostListener('document:keydown.enter')
  onEnter() {
    if (this.loading) return;
    this.login();
  }
}

import {
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

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

  // Combined "Имя и фамилия" field — split into first/last on submit.
  fullName = '';

  // 4-digit access code, stored as one string per cell for the PIN panel.
  accessCodeDigits: string[] = ['', '', '', ''];

  // Заезд/организация, подтягиваются из /settings — отображаются в шапке.
  campName = '';
  campOrganization = '';

  @ViewChildren('codeCell') codeCells!: QueryList<ElementRef<HTMLInputElement>>;

  error = '';
  loading = false;
  showPassword = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private api: ApiService,
  ) {
    if (auth.isLoggedIn) this.router.navigate(['/']);
  }

  ngOnInit() {
    this.api.get('/settings').subscribe({
      next: (d: any) => {
        this.campName = d['camp_name'] ?? '';
        this.campOrganization = d['camp_organization'] ?? '';
      },
      error: () => {},
    });
  }

  get accessCode(): string {
    return this.accessCodeDigits.join('');
  }

  /**
   * Without this, *ngFor diffs accessCodeDigits by value ('5' vs '')
   * and treats every digit change as "remove old item, insert new
   * item" — which destroys and recreates the <input> DOM node. A
   * recreated input loses focus immediately, so the very next
   * keystroke (a second Backspace, a digit, anything) lands on
   * nothing. Tracking by index keeps the same four <input> elements
   * alive for the whole lifetime of the component; only their value
   * changes, which Angular can update in place without touching focus.
   */
  trackByIndex(index: number): number {
    return index;
  }

  /** Handles typing into a PIN cell: keeps only the last digit typed, auto-advances. */
  onCodeInput(index: number) {
    const value = this.accessCodeDigits[index]?.replace(/\D/g, '').slice(-1);

    this.accessCodeDigits[index] = value;

    if (value && index < 3) {
      this.focusCell(index + 1);
    }
  }
  onCodeKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      // Если текущая ячейка не пустая —
      // пусть браузер удаляет символ сам
      if (this.accessCodeDigits[index]) {
        return;
      }

      // Если пустая — переходим назад
      if (index > 0) {
        event.preventDefault();

        this.focusCell(index - 1);

        // очищаем предыдущую
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

  /** Selects the cell's content on focus so typing always replaces, never appends. */
  onCodeFocus(event: FocusEvent) {
    (event.target as HTMLInputElement).select();
  }

  /** Supports pasting a full 4-digit code into any cell. */
  onCodePaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, 4).split('');
    if (!digits.length) return;
    event.preventDefault();

    digits.forEach((d, i) => {
      this.accessCodeDigits[i] = d;
    });
    const nextIndex = Math.min(digits.length, this.accessCodeDigits.length - 1);
    this.focusCell(nextIndex, true);
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
      const { firstName, lastName } = this.splitFullName(this.fullName);
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

  /** Splits "Имя Фамилия" into parts; everything after the first word becomes lastName. */
  private splitFullName(value: string): {
    firstName: string;
    lastName: string;
  } {
    const trimmed = value.trim().replace(/\s+/g, ' ');
    const [firstName = '', ...rest] = trimmed.split(' ');
    return { firstName, lastName: rest.join(' ') };
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}

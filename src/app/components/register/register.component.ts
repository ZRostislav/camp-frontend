import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';

type Step = 1 | 2 | 3;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './register.component.html',
})
export class RegisterComponent implements OnInit {
  currentStep: Step = 1;
  readonly totalSteps = 3;
  readonly steps: Step[] = [1, 2, 3];

  readonly stepMeta: Record<Step, { icon: string; label: string }> = {
    1: { icon: 'user-plus', label: 'Имя и логин' },
    2: { icon: 'lock', label: 'Пароль' },
    3: { icon: 'briefcase', label: 'Роль' },
  };

  firstName = '';
  lastName = '';
  username = '';
  password = '';
  passwordConfirm = '';
  requestedRole = 'helper';
  showPassword = false;

  campColor = '#F59E0B';

  roles = [
    { value: 'admin', label: 'Администратор', emoji: '👑' },
    { value: 'counselor', label: 'Вожатый', emoji: '🏕️' },
    { value: 'helper', label: 'Помощник', emoji: '🤝' },
    { value: 'staff', label: 'Персонал', emoji: '🔧' },
  ];

  error = '';
  success = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private settings: SettingsService,
  ) {}

  ngOnInit() {
    this.settings.get().subscribe({
      next: (d) => {
        this.campColor = (d['camp_color'] as string) ?? '#F59E0B';
      },
      error: () => {},
    });
  }

  get campColorLight(): string {
    return this.hexToRgba(this.campColor, 0.12);
  }

  get campColorBg(): string {
    return this.hexToRgba(this.campColor, 0.08);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`;
  }

  nextStep() {
    this.error = '';
    if (this.currentStep === 1) {
      if (
        !this.firstName.trim() ||
        !this.lastName.trim() ||
        !this.username.trim()
      ) {
        this.error = 'Заполните имя, фамилию и логин';
        return;
      }
      this.currentStep = 2;
      return;
    }
    if (this.currentStep === 2) {
      const err = this.validatePassword();
      if (err) {
        this.error = err;
        return;
      }
      this.currentStep = 3;
    }
  }

  prevStep() {
    if (this.currentStep === 1) return;
    this.error = '';
    this.currentStep = (this.currentStep - 1) as Step;
  }

  private validatePassword(): string {
    if (!this.password) return 'Введите пароль';
    if (this.password.length < 6)
      return 'Пароль должен содержать минимум 6 символов';
    if (this.password !== this.passwordConfirm) return 'Пароли не совпадают';
    return '';
  }

  submit() {
    this.error = '';
    this.success = '';
    const err = this.validatePassword();
    if (err) {
      this.error = err;
      this.currentStep = 2;
      return;
    }
    this.loading = true;
    const fullName = `${this.lastName.trim()} ${this.firstName.trim()}`.trim();
    this.auth
      .register(fullName, this.username, this.password, this.requestedRole)
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.success =
            res.message ||
            'Заявка отправлена. Ожидайте одобрения администратора.';
          this.resetForm();
        },
        error: (e) => {
          this.loading = false;
          const message = e.error?.error || 'Ошибка отправки заявки';
          this.error = message;
          if (/парол/i.test(message)) this.currentStep = 2;
          else if (/логин/i.test(message)) this.currentStep = 1;
        },
      });
  }

  private resetForm() {
    this.firstName = '';
    this.lastName = '';
    this.username = '';
    this.password = '';
    this.passwordConfirm = '';
    this.requestedRole = 'helper';
    this.currentStep = 1;
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  @HostListener('document:keydown.enter')
  onEnter() {
    if (this.loading || this.success) return;
    if (this.currentStep < this.totalSteps) this.nextStep();
    else this.submit();
  }
}

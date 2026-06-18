import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { AuthService } from '../../services/auth.service';

type Step = 1 | 2 | 3;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  currentStep: Step = 1;
  readonly totalSteps = 3;
  readonly steps: Step[] = [1, 2, 3];

  // Step labels/icons shown in the header — kept in one place so the
  // template and the step logic can't drift out of sync.
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
  ) {}

  /** Validates the current step and, if it passes, advances to the next one. */
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
      const passwordError = this.validatePassword();
      if (passwordError) {
        this.error = passwordError;
        return;
      }
      this.currentStep = 3;
    }
  }

  /** Goes back one step, clearing any error from the step being left. */
  prevStep() {
    if (this.currentStep === 1) return;
    this.error = '';
    this.currentStep = (this.currentStep - 1) as Step;
  }

  /**
   * Checks the password fields and returns a human-readable problem
   * description, or '' if everything is fine. Kept separate from
   * nextStep() so submit() can re-run the same check as a safety net.
   */
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

    // Defensive re-check: if the passwords somehow don't match by the
    // time we reach the final step, send the user back to the password
    // step instead of letting a bad request hit the server.
    const passwordError = this.validatePassword();
    if (passwordError) {
      this.error = passwordError;
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

          // Route the user back to whichever step the server-side
          // problem actually belongs to, so they see the message next
          // to the field that caused it.
          if (/парол/i.test(message)) {
            this.currentStep = 2;
          } else if (/логин/i.test(message)) {
            this.currentStep = 1;
          }
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
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  fullName = '';
  username = '';
  password = '';
  passwordConfirm = '';
  requestedRole = 'helper';
  roles = ['admin', 'counselor', 'helper', 'staff'];

  error = '';
  success = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.error = '';
    this.success = '';

    if (!this.fullName || !this.username || !this.password) {
      this.error = 'Заполните ФИО, логин и пароль';
      return;
    }
    if (this.password !== this.passwordConfirm) {
      this.error = 'Пароли не совпадают';
      return;
    }

    this.loading = true;
    this.auth.register(this.fullName, this.username, this.password, this.requestedRole).subscribe({
      next: (res) => {
        this.loading = false;
        this.success = res.message || 'Заявка отправлена. Ожидайте одобрения администратора.';
        this.fullName = '';
        this.username = '';
        this.password = '';
        this.passwordConfirm = '';
        this.requestedRole = 'helper';
      },
      error: (e) => {
        this.loading = false;
        this.error = e.error?.error || 'Ошибка отправки заявки';
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}

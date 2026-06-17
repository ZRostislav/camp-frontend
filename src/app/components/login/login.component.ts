import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  mode: 'staff' | 'participant' = 'staff';
  username = '';
  password = '';
  lastName = '';
  firstName = '';
  accessCode = '';
  error = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {
    if (auth.isLoggedIn) this.router.navigate(['/']);
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
      this.auth
        .participantLogin(this.lastName, this.firstName, this.accessCode)
        .subscribe({
          next: () => this.router.navigate(['/']),
          error: (e) => {
            this.error = e.error?.error || 'Ошибка входа';
            this.loading = false;
          },
        });
    }
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}

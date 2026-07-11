import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  fullName?: string;
  full_name?: string;
  username?: string;
  role: string;
  houseId?: number;
  lastName?: string;
  firstName?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;
  currentUser = signal<User | null>(null);
  private myHouseAvailable = signal(false);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    const stored = localStorage.getItem('user');
    if (stored) {
      this.currentUser.set(JSON.parse(stored));
      this.refreshMyHouseAccess();
    }
  }

  get token() {
    return localStorage.getItem('token');
  }
  get isLoggedIn() {
    return !!this.token;
  }
  get role() {
    return this.currentUser()?.role;
  }
  isAdmin() {
    return ['superadmin', 'admin'].includes(this.role || '');
  }
  isSuperAdmin() {
    return this.role === 'superadmin';
  }
  isStaff() {
    return ['superadmin', 'admin', 'counselor', 'helper', 'staff'].includes(
      this.role || '',
    );
  }
  isCounselorOrHelper() {
    return ['counselor', 'helper'].includes(this.role || '');
  }
  // Доступ к странице "Мой домик": участник видит свой домик,
  // вожатый/помощник — закреплённый за ним, а админ/суперадмин получают
  // быстрый доступ к разделу, если у них есть связанный домик.
  canViewMyHouse() {
    return this.isAdmin() || this.myHouseAvailable();
  }

  refreshMyHouseAccess() {
    if (!this.token || !this.role) {
      this.myHouseAvailable.set(false);
      return;
    }

    this.http
      .get(`${this.api}/houses/mine`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${this.token}` }),
      })
      .subscribe({
        next: () => this.myHouseAvailable.set(true),
        error: () => this.myHouseAvailable.set(false),
      });
  }

  staffLogin(username: string, password: string) {
    return this.http
      .post<{
        token: string;
        user: User;
      }>(`${this.api}/auth/staff/login`, { username, password })
      .pipe(tap((res) => this.saveSession(res.token, res.user)));
  }

  participantLogin(lastName: string, firstName: string, accessCode: string) {
    return this.http
      .post<{
        token: string;
        user: User;
      }>(`${this.api}/auth/participant/login`, {
        lastName,
        firstName,
        accessCode,
      })
      .pipe(tap((res) => this.saveSession(res.token, res.user)));
  }

  // Регистрация нового сотрудника — создаёт заявку, ожидающую одобрения admin/superadmin.
  // Сессию НЕ открывает (пользователя ещё не существует в users до одобрения).
  register(
    fullName: string,
    username: string,
    password: string,
    requestedRole: string,
  ) {
    return this.http.post<{ message: string; registration: any }>(
      `${this.api}/auth/register`,
      { fullName, username, password, requestedRole },
    );
  }

  changeOwnPassword(
    currentPassword: string,
    newPassword: string,
    newPasswordConfirm: string,
  ) {
    return this.http.put<{ message: string }>(
      `${this.api}/auth/me/password`,
      { currentPassword, newPassword, newPasswordConfirm },
      { headers: new HttpHeaders({ Authorization: `Bearer ${this.token}` }) },
    );
  }

  private saveSession(token: string, user: User) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUser.set(user);
    this.refreshMyHouseAccess();
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.myHouseAvailable.set(false);
    this.router.navigate(['/login']);
  }
}

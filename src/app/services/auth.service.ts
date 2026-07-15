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
  /** id домика персонала (вожатый/помощник), закреплённого через
   *  house_responsible. У участника id домика уже есть в самом
   *  currentUser (houseId из токена) — см. getMyHouseId(). */
  private myHouseId = signal<number | null>(null);

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

  /**
   * id "своего" домика — синхронно, без похода в API.
   * У участника id зашит прямо в токене (currentUser().houseId).
   * У персонала (counselor/helper) берём из кэша, который обновляется
   * в refreshMyHouseAccess() при каждой навигации (см. layout.component.ts)
   * — то есть к моменту клика по ссылке на домик кэш почти всегда уже тёплый.
   * Может вернуть null, если кэш ещё не успел прогреться (например, самая
   * первая навигация сразу после логина) — в этом случае вызывающий код
   * должен подстраховаться асинхронной проверкой.
   */
  getMyHouseId(): number | null {
    if (this.role === 'participant') {
      return this.currentUser()?.houseId ?? null;
    }
    return this.myHouseId();
  }

  refreshMyHouseAccess() {
    if (!this.token || !this.role) {
      this.myHouseAvailable.set(false);
      this.myHouseId.set(null);
      return;
    }

    this.http
      .get<{ id: number }>(`${this.api}/houses/mine`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${this.token}` }),
      })
      .subscribe({
        next: (d) => {
          this.myHouseAvailable.set(true);
          this.myHouseId.set(d?.id ?? null);
        },
        error: () => {
          this.myHouseAvailable.set(false);
          this.myHouseId.set(null);
        },
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
    this.myHouseId.set(null);
    this.router.navigate(['/login']);
  }
}

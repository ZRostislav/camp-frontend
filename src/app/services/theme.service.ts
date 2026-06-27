import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'app_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private api = environment.apiUrl;
  private _current: Theme = 'light';

  get current(): Theme { return this._current; }

  constructor(private http: HttpClient) {}

  /**
   * Called once on app bootstrap (AppComponent.ngOnInit).
   * 1. Apply cached theme instantly (no flash).
   * 2. Fetch /auth/me to get server-side theme.
   * 3. Apply & cache the server value.
   */
  async init(token: string | null): Promise<void> {
    const cached = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (cached === 'light' || cached === 'dark') {
      this.apply(cached);
    }

    if (!token) return;

    try {
      const res: any = await firstValueFrom(
        this.http.get(`${this.api}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      const serverTheme: Theme =
        res?.theme === 'dark' ? 'dark' : 'light';
      this.apply(serverTheme);
      localStorage.setItem(STORAGE_KEY, serverTheme);
    } catch {
      // Keep cached/default
    }
  }

  /**
   * Switch theme, persist to server, update DOM & cache.
   */
  async setTheme(theme: Theme, token: string | null): Promise<void> {
    this.apply(theme);
    localStorage.setItem(STORAGE_KEY, theme);

    if (!token) return;
    try {
      await firstValueFrom(
        this.http.put(
          `${this.api}/auth/me/theme`,
          { theme },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );
    } catch {
      // Best-effort — local already applied
    }
  }

  private apply(theme: Theme): void {
    this._current = theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

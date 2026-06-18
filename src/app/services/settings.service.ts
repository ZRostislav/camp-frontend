import { Injectable } from '@angular/core';
import { Observable, of, tap, BehaviorSubject } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface CampSettings {
  camp_name: string;
  camp_organization: string;
  [key: string]: unknown;
}

const LS_KEY = 'camp_settings_cache';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  /**
   * In-memory observable — живёт только в рамках одной сессии (без перезагрузки).
   * При каждом холодном старте (page reload) settings$ == null → идём на HTTP.
   */
  private settings$: Observable<CampSettings> | null = null;

  /**
   * BehaviorSubject для live-обновлений внутри сессии.
   * LayoutComponent подписывается и сразу видит изменения из patch().
   */
  private _live$ = new BehaviorSubject<Partial<CampSettings>>({});
  readonly live$ = this._live$.asObservable();

  constructor(private api: ApiService) {}

  /**
   * Возвращает настройки.
   *
   * Приоритет:
   *  1. In-memory (shareReplay) — повторные вызовы в рамках одной сессии.
   *  2. HTTP — всегда при холодном старте (page reload).
   *     localStorage больше НЕ используется как источник при get(),
   *     только patch() пишет туда для того чтобы live$ работал после
   *     invalidate()+patch() внутри сессии.
   *
   * Вызови invalidate() чтобы сбросить in-memory и получить свежие данные
   * при следующем get() (например, после сохранения настроек).
   */
  get(): Observable<CampSettings> {
    if (this.settings$) {
      return this.settings$;
    }

    // Холодный старт — всегда HTTP, пишем полный объект в localStorage
    // чтобы patch() мог мержить поверх него.
    this.settings$ = (
      this.api.get('/settings') as Observable<CampSettings>
    ).pipe(
      tap((data) => this.writeLocalStorage(data)),
      shareReplay(1),
    );

    return this.settings$;
  }

  /**
   * Немедленно обновляет кэш (localStorage + live$) без HTTP-запроса.
   * Используй при живом изменении полей формы — layout обновится мгновенно.
   * HTTP-запрос идёт отдельно при нажатии «Сохранить».
   */
  patch(partial: Partial<CampSettings>): void {
    const current = this.readLocalStorage() ?? ({} as CampSettings);
    const updated = { ...current, ...partial };
    this.writeLocalStorage(updated);

    // Сбрасываем in-memory — следующий get() внутри сессии возьмёт свежие данные
    this.settings$ = null;

    this._live$.next(updated);
  }

  /**
   * Сбрасывает только in-memory observable.
   * localStorage НЕ трогаем — там лежит последний полный объект с бэка,
   * patch() будет мержить поверх него корректно.
   */
  invalidate(): void {
    this.settings$ = null;
  }

  /**
   * Returns the last cached settings snapshot from localStorage without HTTP.
   * Useful for fast UI bootstrapping like the browser title.
   */
  peekCache(): Partial<CampSettings> | null {
    return this.readLocalStorage();
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private readLocalStorage(): CampSettings | null {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as CampSettings) : null;
    } catch {
      return null;
    }
  }

  private writeLocalStorage(data: CampSettings): void {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch {
      // Quota exceeded or access denied - silently ignore.
    }
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

/**
 * Статус непрочитанных новостей для текущего пользователя.
 *
 * Источник истины — бэкенд (таблица news_reads): каждая новость из
 * GET /news приходит с полем is_read именно для текущего пользователя/
 * участника, а общее число непрочитанных берётся из GET /news/unread-count.
 * Отметка «прочитано» — POST /news/:id/read (идемпотентно, можно вызывать
 * повторно без вреда).
 *
 * Сервис — синглтон (providedIn: 'root'), поэтому счётчик, который видно
 * в сайдбаре и на главной, живёт отдельно от списка на самой странице
 * «Новости» и обновляется реактивно через unreadCount$.
 */
@Injectable({ providedIn: 'root' })
export class NewsStatusService {
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();
  hasUnread$ = this.unreadCount$.pipe(map((c) => c > 0));

  constructor(private api: ApiService) {
    this.refresh();
  }

  /** Перезапрашивает счётчик непрочитанных у бэкенда. */
  refresh(): void {
    this.api.get<{ count: number }>('/news/unread-count').subscribe({
      next: (d: any) => this.unreadCountSubject.next(d?.count ?? 0),
      error: () => {},
    });
  }

  /** Отмечает одну новость прочитанной на бэкенде. */
  markRead(id: number) {
    return this.api.post(`/news/${id}/read`, {});
  }

  /**
   * Отмечает несколько новостей прочитанными и один раз обновляет счётчик
   * по завершении всех запросов (успешных или нет).
   */
  markManyRead(ids: number[]): void {
    const unique = Array.from(new Set(ids)).filter((id) => id != null);
    if (!unique.length) return;

    let remaining = unique.length;
    const done = () => {
      remaining -= 1;
      if (remaining === 0) this.refresh();
    };

    unique.forEach((id) => {
      this.markRead(id).subscribe({ next: done, error: done });
    });
  }
}

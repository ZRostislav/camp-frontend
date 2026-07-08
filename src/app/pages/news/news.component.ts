import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { NewsStatusService } from '../../services/news-status.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, IconComponent],
  templateUrl: './news.component.html',
})
export class NewsComponent implements OnInit, OnDestroy {
  news: any[] = [];
  form: any = { title: '', text: '', pinned: false };
  editItem: any = null;
  error = '';
  msg = '';
  showForm = false;

  campColor = '#F59E0B';

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private settings: SettingsService,
    private newsStatus: NewsStatusService,
  ) {}

  ngOnInit() {
    this.settings.get().subscribe({
      next: (d) => {
        this.campColor = (d['camp_color'] as string) ?? '#F59E0B';
      },
      error: () => {},
    });
    this.load();
  }

  ngOnDestroy() {
    // Пользователь уходит со страницы новостей — то, что он успел увидеть,
    // отмечаем прочитанным на бэкенде (бейджи на главной/в меню погаснут).
    this.markAllRead();
  }

  load() {
    this.error = '';
    this.msg = '';
    this.api.get('/news').subscribe({
      next: (d: any) => {
        // Каждая новость приходит с реальным is_read для текущего
        // пользователя (см. GET /news на бэкенде). Список не переопределяется
        // повторно до следующего load(), поэтому бейджи «непрочитано»
        // остаются видимыми весь визит, даже после markAllRead().
        this.news = d;
        this.newsStatus.refresh();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка загрузки'),
    });
  }

  isUnread(n: any): boolean {
    return !n?.is_read;
  }

  get unreadCount(): number {
    return this.news.filter((n) => this.isUnread(n)).length;
  }

  /** Явная кнопка «отметить всё прочитанным», не дожидаясь ухода со страницы */
  markAllRead() {
    const unreadIds = this.news.filter((n) => this.isUnread(n)).map((n) => n.id);
    if (!unreadIds.length) return;
    this.newsStatus.markManyRead(unreadIds);
    // Оптимистично обновляем локально, чтобы подсветка/бейджи погасли сразу,
    // не дожидаясь ответа сервера.
    this.news = this.news.map((n) =>
      unreadIds.includes(n.id) ? { ...n, is_read: true } : n,
    );
  }

  create() {
    this.error = '';
    this.api.post('/news', this.form).subscribe({
      next: () => {
        this.msg = 'Новость опубликована';
        this.form = { title: '', text: '', pinned: false };
        this.showForm = false;
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  startEdit(n: any) {
    this.editItem = { ...n };
  }

  saveEdit() {
    this.error = '';
    this.api
      .put(`/news/${this.editItem.id}`, {
        title: this.editItem.title,
        text: this.editItem.text,
        pinned: this.editItem.pinned,
      })
      .subscribe({
        next: () => {
          this.editItem = null;
          this.msg = 'Изменения сохранены';
          this.load();
        },
        error: (e) => (this.error = e.error?.error || 'Ошибка'),
      });
  }

  remove(id: number) {
    if (!confirm('Удалить новость?')) return;
    this.api.delete(`/news/${id}`).subscribe({
      next: () => {
        this.msg = 'Новость удалена';
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  /** Считается «новой», если создана в последние 24 часа */
  isNew(n: any): boolean {
    if (!n.created_at) return false;
    return Date.now() - new Date(n.created_at).getTime() < 24 * 60 * 60 * 1000;
  }
}

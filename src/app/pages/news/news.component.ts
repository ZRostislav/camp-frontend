import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({ selector: 'app-news', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './news.component.html' })
export class NewsComponent implements OnInit {
  news: any[] = [];
  form: any = { title: '', text: '', pinned: false };
  editItem: any = null;
  error = '';
  msg = '';

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit() { this.load(); }
  load() { this.api.get('/news').subscribe({ next: (d: any) => this.news = d, error: e => this.error = e.error?.error || 'Ошибка' }); }

  create() {
    this.api.post('/news', this.form).subscribe({
      next: () => { this.msg = 'Создано'; this.form = { title: '', text: '', pinned: false }; this.load(); },
      error: e => this.error = e.error?.error || 'Ошибка'
    });
  }

  startEdit(n: any) { this.editItem = { ...n }; }

  saveEdit() {
    this.api.put(`/news/${this.editItem.id}`, { title: this.editItem.title, text: this.editItem.text, pinned: this.editItem.pinned }).subscribe({
      next: () => { this.editItem = null; this.msg = 'Сохранено'; this.load(); },
      error: e => this.error = e.error?.error || 'Ошибка'
    });
  }

  remove(id: number) {
    if (!confirm('Удалить новость?')) return;
    this.api.delete(`/news/${id}`).subscribe({ next: () => { this.msg = 'Удалено'; this.load(); }, error: e => this.error = e.error?.error || 'Ошибка' });
  }
}

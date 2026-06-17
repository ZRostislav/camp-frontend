import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({ selector: 'app-points', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './points.component.html' })
export class PointsComponent implements OnInit {
  houses: any[] = [];
  participants: any[] = [];
  mode: 'participant' | 'house' = 'participant';
  selectedId: any = '';
  history: any = null;
  addForm: any = { points: 0, reason: '' };
  editEntry: any = null;
  error = '';
  msg = '';

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit() {
    this.api.get('/houses').subscribe({ next: (d: any) => this.houses = d, error: () => {} });
    this.api.get('/participants').subscribe({ next: (d: any) => this.participants = d, error: () => {} });
  }

  loadHistory() {
    if (!this.selectedId) return;
    const path = this.mode === 'participant' ? `/points/participant/${this.selectedId}/history` : `/points/house/${this.selectedId}/history`;
    this.api.get(path).subscribe({ next: (d: any) => this.history = d, error: e => this.error = e.error?.error || 'Ошибка' });
  }

  addPoints() {
    const path = this.mode === 'participant' ? `/points/participant/${this.selectedId}` : `/points/house/${this.selectedId}`;
    this.api.post(path, { points: Number(this.addForm.points), reason: this.addForm.reason }).subscribe({
      next: () => { this.msg = 'Баллы начислены'; this.addForm = { points: 0, reason: '' }; this.loadHistory(); },
      error: e => this.error = e.error?.error || 'Ошибка'
    });
  }

  startEdit(e: any) { this.editEntry = { ...e }; }

  saveEdit() {
    this.api.put(`/points/entries/${this.editEntry.id}`, { points: Number(this.editEntry.points), reason: this.editEntry.reason }).subscribe({
      next: () => { this.editEntry = null; this.msg = 'Обновлено'; this.loadHistory(); },
      error: e => this.error = e.error?.error || 'Ошибка'
    });
  }

  deleteEntry(id: number) {
    if (!confirm('Удалить запись?')) return;
    this.api.delete(`/points/entries/${id}`).subscribe({
      next: () => { this.msg = 'Удалено'; this.loadHistory(); },
      error: e => this.error = e.error?.error || 'Ошибка'
    });
  }
}

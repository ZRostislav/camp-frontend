import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-participants',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './participants.component.html',
})
export class ParticipantsComponent implements OnInit {
  participants: any[] = [];
  houses: any[] = [];
  searchQuery = '';
  filterHouseId: any = '';
  form: any = {
    lastName: '',
    firstName: '',
    birthDate: '',
    gender: 'м',
    city: '',
    houseId: '',
    hasPoints: true,
  };
  editItem: any = null;
  error = '';
  msg = '';

  constructor(
    public auth: AuthService,
    private api: ApiService,
  ) {}

  ngOnInit() {
    this.load();
    this.api
      .get('/houses')
      .subscribe({ next: (d: any) => (this.houses = d), error: () => {} });
  }

  load() {
    const params: any = {};
    if (this.searchQuery) params['search'] = this.searchQuery;
    if (this.filterHouseId) params['houseId'] = this.filterHouseId;
    this.api
      .get('/participants', params)
      .subscribe({
        next: (d: any) => (this.participants = d),
        error: (e) => (this.error = e.error?.error || 'Ошибка'),
      });
  }

  create() {
    const body = { ...this.form, houseId: this.form.houseId || null };
    this.api.post('/participants', body).subscribe({
      next: () => {
        this.msg = 'Создан';
        this.form = {
          lastName: '',
          firstName: '',
          birthDate: '',
          gender: 'м',
          city: '',
          houseId: '',
          hasPoints: true,
        };
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  startEdit(p: any) {
    this.editItem = { ...p, houseId: p.house_id };
  }

  saveEdit() {
    const body = {
      lastName: this.editItem.last_name,
      firstName: this.editItem.first_name,
      birthDate: this.editItem.birth_date,
      gender: this.editItem.gender,
      city: this.editItem.city,
      houseId: this.editItem.houseId || null,
      hasPoints: this.editItem.has_points,
    };
    this.api.put(`/participants/${this.editItem.id}`, body).subscribe({
      next: () => {
        this.editItem = null;
        this.msg = 'Сохранено';
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  resetCode(id: number) {
    this.api.post(`/participants/${id}/reset-code`, {}).subscribe({
      next: (d: any) => {
        this.msg = `Новый код: ${d.access_code}`;
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  remove(id: number) {
    if (!confirm('Удалить?')) return;
    this.api.delete(`/participants/${id}`).subscribe({
      next: () => {
        this.msg = 'Удалён';
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }
}

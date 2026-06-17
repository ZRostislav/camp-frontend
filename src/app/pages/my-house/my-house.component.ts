import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';

// "Мой домик" — страница для участника (его собственный домик) и
// вожатого/помощника (домик, закреплённый за ним через house_responsible).
// Данные приходят с бэкенда уже отфильтрованными по доступу к коду
// доступа (access_code): для counselor/helper — виден их домика,
// для participant — не виден никогда (см. src/utils/houseAccess.js).
@Component({
  selector: 'app-my-house',
  standalone: true,
  imports: [CommonModule, MediaUrlPipe],
  templateUrl: './my-house.component.html',
})
export class MyHouseComponent implements OnInit {
  house: any = null;
  loading = true;
  error = '';

  constructor(
    public auth: AuthService,
    private api: ApiService,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.api.get('/houses/mine').subscribe({
      next: (d: any) => {
        this.house = d;
        this.loading = false;
      },
      error: (e) => {
        this.error = e.error?.error || 'Ошибка загрузки';
        this.house = null;
        this.loading = false;
      },
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  houses: any[] = [];
  news: any[] = [];
  schedule: any[] = [];
  loading = true;

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit() {
    this.api.get('/houses').subscribe({ next: (d: any) => this.houses = d, error: () => {} });
    this.api.get('/news').subscribe({ next: (d: any) => { this.news = d.slice(0, 3); this.loading = false; }, error: () => { this.loading = false; } });
    this.api.get('/schedule').subscribe({ next: (d: any) => this.schedule = d, error: () => {} });
  }
}

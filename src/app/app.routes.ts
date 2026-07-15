import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { LayoutComponent } from './components/layout/layout.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'error/no-access',
    loadComponent: () =>
      import('./pages/error-no-token/error-no-token.component').then(
        (m) => m.ErrorNoTokenComponent,
      ),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'profile/me',
        loadComponent: () =>
          import('./pages/profile/profile.component').then(
            (m) => m.UserProfileComponent,
          ),
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./pages/profile/profile.component').then(
            (m) => m.UserProfileComponent,
          ),
      },
      {
        path: 'participants',
        loadComponent: () =>
          import('./pages/participants/participants.component').then(
            (m) => m.ParticipantsComponent,
          ),
      },
      {
        path: 'participants/:id',
        loadComponent: () =>
          import('./pages/profile/profile.component').then(
            (m) => m.UserProfileComponent,
          ),
      },
      {
        path: 'houses',
        loadComponent: () =>
          import('./pages/houses/houses.component').then(
            (m) => m.HousesComponent,
          ),
      },
      // "Мой домик" — тот же компонент, что и для house/:id, но с
      // data.mine=true, чтобы он резолвил домик текущего пользователя
      // через GET /houses/mine вместо GET /houses/:id.
      // Обязательно ДО 'house/:id' — иначе роутер примет "my" за :id.
      {
        path: 'house/my',
        data: { mine: true },
        loadComponent: () =>
          import('./pages/house/house.component').then((m) => m.HouseComponent),
      },
      // Домик по id — доступно любому авторизованному пользователю
      // (как profile для participants/:id и users/:id).
      {
        path: 'house/:id',
        loadComponent: () =>
          import('./pages/house/house.component').then((m) => m.HouseComponent),
      },
      {
        path: 'points',
        loadComponent: () =>
          import('./pages/points/points.component').then(
            (m) => m.PointsComponent,
          ),
      },
      {
        path: 'rollcalls',
        loadComponent: () =>
          import('./pages/rollcalls/rollcalls.component').then(
            (m) => m.RollcallsComponent,
          ),
      },
      {
        path: 'news',
        loadComponent: () =>
          import('./pages/news/news.component').then((m) => m.NewsComponent),
      },
      {
        path: 'schedule',
        loadComponent: () =>
          import('./pages/schedule/schedule.component').then(
            (m) => m.ScheduleComponent,
          ),
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./pages/events/events.component').then(
            (m) => m.EventsComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then(
            (m) => m.SettingsComponent,
          ),
      },
      {
        path: 'error',
        loadComponent: () =>
          import('./pages/error/error.component').then((m) => m.ErrorComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

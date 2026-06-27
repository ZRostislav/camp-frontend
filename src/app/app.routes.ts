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
        path: 'participants',
        loadComponent: () =>
          import('./pages/participants/participants.component').then(
            (m) => m.ParticipantsComponent,
          ),
      },
      {
        path: 'houses',
        loadComponent: () =>
          import('./pages/houses/houses.component').then(
            (m) => m.HousesComponent,
          ),
      },
      {
        path: 'my-house',
        loadComponent: () =>
          import('./pages/my-house/my-house.component').then(
            (m) => m.MyHouseComponent,
          ),
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
        path: 'contests',
        loadComponent: () =>
          import('./pages/contests/contests.component').then(
            (m) => m.ContestsComponent,
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
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

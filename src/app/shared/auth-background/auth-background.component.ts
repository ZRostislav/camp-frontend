import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Fixed decorative background shown on login/register screens.
 * Lives outside the router outlet so the emojis are never destroyed
 * during page transitions — no jump, no re-spawn flicker.
 *
 * Usage in AppComponent template (wrap around <router-outlet>):
 *
 *   <app-auth-background *ngIf="isAuthRoute"></app-auth-background>
 *   <router-outlet></router-outlet>
 */
@Component({
  selector: 'app-auth-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-background.component.html',
  styleUrls: ['./auth-background.component.css'],
})
export class AuthBackgroundComponent {}

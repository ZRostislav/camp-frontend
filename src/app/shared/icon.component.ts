import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Inline-SVG icon component.
 *
 * Why this exists: lucide-angular resolves <lucide-icon name="..."> at
 * render time through an Angular DI token (LUCIDE_ICONS) that is populated
 * by LucideAngularModule.pick({...}). If an icon name isn't in that pick
 * list — even if you imported the icon constant inside a component file —
 * Angular throws:
 *   "The 'tent' icon has not been provided by any available icon providers."
 *
 * Importing `Tent` in login.component.ts only puts the icon's path data in
 * scope for *your* code; it does NOT register it with lucide-angular's
 * renderer, so any name not explicitly passed to .pick() in app.config.ts
 * (or a module-level provider) breaks at runtime, often only on icons you
 * add later. That's exactly what happened with "tent" and "user".
 *
 * Fix used here: drop lucide-angular entirely and render raw SVG paths
 * directly in the template via [innerHTML] from a fixed path-data map.
 * There is no provider, no DI token, no .pick() list to keep in sync —
 * so this class of error becomes structurally impossible.
 *
 * Paths below are taken from the Lucide icon set (ISC licensed), redrawn
 * as plain <path> data so no external icon library is required at all.
 */

const ICON_PATHS: Record<string, string> = {
  shield: 'M12 2 4 5v6c0 5.2 3.4 9 8 11 4.6-2 8-5.8 8-11V5z',
  tent: 'M3.5 21 12 3l8.5 18M3.5 21h17M7 21l5-10.5L17 21M12 13l2.5 8',
  user: 'M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM4.5 21a7.5 7.5 0 0 1 15 0',
  lock: 'M6 11V8a6 6 0 1 1 12 0v3 M5 11h14v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z',
  eye: 'M2.5 12S5.5 5.5 12 5.5 21.5 12 21.5 12 18.5 18.5 12 18.5 2.5 12 2.5 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'eye-off':
    'M3 3l18 18 M10.6 5.1A10.7 10.7 0 0 1 12 5c6.5 0 9.5 6.5 9.5 6.5a13.9 13.9 0 0 1-2.4 3.3 M6.6 6.6C4 8.4 2.5 11 2.5 11.5S5.5 18 12 18a10.6 10.6 0 0 0 2.8-.4 M9.9 9.9a3 3 0 0 0 4.2 4.2',
  'log-in': 'M10 17l5-5-5-5 M15 12H3 M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4',
  'arrow-right': 'M4 12h16 M13 5l7 7-7 7',
  'arrow-left': 'M20 12H4 M11 19l-7-7 7-7',
  'circle-alert':
    'M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19Z M12 7.5v6 M12 16.5h.01',
  'circle-check':
    'M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19Z M8.2 12.3l2.5 2.5 5-5.4',
  smile:
    'M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19Z M8.2 14.2s1.4 2 3.8 2 3.8-2 3.8-2 M9 9.5h.01 M15 9.5h.01',
  'key-round':
    'M14.5 9.5a5 5 0 1 0-3.7 4.8L9 16.1l1.6 1.6L9 19.4l1.7 1.7 M14.5 9.5a5 5 0 0 1-4.9 5 M14.5 9.5l4-4',
  'user-plus':
    'M9.5 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2.5 20.5a7 7 0 0 1 14 0 M19 8v6 M22 11h-6',
  'id-card':
    'M3.5 5.5h17a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z M8 11.2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M5.5 16.3a3 3 0 0 1 5 0 M14 9.5h5 M14 13h5',
  briefcase:
    'M3.5 7.5h17a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1Z M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5 M2.5 12.5h19',
  send: 'M21.5 2.5 11 13 M21.5 2.5 14.8 21.5 11 13 2.5 9.2Z',
  check: 'M20 6 9 17l-5-5',

  // ── Layout / navigation ────────────────────────────────────────────
  'layout-dashboard': 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  home: 'M3 12L12 3l9 9 M9 21V12h6v9',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  x: 'M18 6L6 18 M6 6l12 12',
  'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',

  // ── Camp screens ───────────────────────────────────────────────────
  users:
    'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z M2.5 21a8 8 0 0 1 15.5-2.6 M19 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z M21.5 21a5.5 5.5 0 0 0-5-3.3',
  'user-check':
    'M9.5 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M2.5 20.5a7 7 0 0 1 14 0 M16 11l2 2 4-4',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 18l-6.2 3.1 1.2-6.9L2 9.3l6.9-1Z',
  'clipboard-list':
    'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 M9 12h6 M9 16h4',
  newspaper:
    'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z M8 7h8 M8 11h8 M8 15h5',
  'calendar-days':
    'M3.5 4.5h17a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z M16 2.5v4 M8 2.5v4 M2.5 9.5h19 M8 13.5h.01 M12 13.5h.01 M16 13.5h.01 M8 17.5h.01 M12 17.5h.01',
  trophy:
    'M8 21h8 M12 17v4 M7 4H4v3c0 2.8 1.7 5.1 4 6 M17 4h3v3c0 2.8-1.7 5.1-4 6 M7 4h10v6a5 5 0 0 1-10 0V4Z',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
};

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      [attr.stroke]="color || 'currentColor'"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="inline-block shrink-0"
    >
      <path *ngFor="let d of pathSegments" [attr.d]="d" />
    </svg>
  `,
})
export class IconComponent {
  @Input() name = '';
  @Input() size = 16;
  @Input() color?: string;

  get pathSegments(): string[] {
    const raw = ICON_PATHS[this.name];
    if (!raw) {
      // Fail loud in dev, but never throw — render nothing instead of
      // crashing the template the way lucide-angular's DI lookup does.
      console.warn(`[app-icon] Unknown icon name: "${this.name}"`);
      return [];
    }
    return raw.split(' M').map((seg, i) => (i === 0 ? seg : 'M' + seg));
  }
}

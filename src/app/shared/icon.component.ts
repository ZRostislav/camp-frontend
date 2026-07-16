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
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42',
  zap: 'M13 2 3 14h9l-1 8 10-12h-9l1-8Z',
  house:
    'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8 M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  pencil: 'M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
  search: 'M21 21l-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  rows: 'M3 5h18M3 10h18M3 15h18M3 20h18',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  key: 'M15.5 7.5 17.8 9.8a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4 M21 2l-9.6 9.6 M13 15.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z',
  'trash-2':
    'M10 11v6 M14 11v6 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M3 6h18 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  plus: 'M5 12h14 M12 5v14',
  'chevron-right': 'm9 18 6-6-6-6',
  'image-plus':
    'M16 5h6 M19 2v6 M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5 M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21 M9 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  'layout-grid':
    'M3 4a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z M14 4a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1z M14 15a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1z M3 15a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  'layout-list':
    'M3 4a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z M3 15a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z M14 4h7 M14 9h7 M14 15h7 M14 20h7',
  'rows-3':
    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M21 9H3 M21 15H3',
  'chevron-down': 'm6 9 6 6 6-6',
  'circle-plus': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M8 12h8 M12 8v8',
  'trending-up': 'M16 7h6v6 M22 7l-8.5 8.5-5-5L2 17',
  'trending-down': 'M16 17h6v-6 M22 17l-8.5-8.5-5 5L2 7',
  'clipboard-check':
    'M8 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 14l2 2 4-4',
  calendar:
    'M8 2v4 M16 2v4 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M3 10h18',
  filter:
    'M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z',
  'chevron-left': 'm15 18-6-6 6-6',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2',
  'circle-x': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M15 9l-6 6 M9 9l6 6',
  'circle-minus': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M8 12h8',
  'clipboard-plus':
    'M8 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 14h6 M12 17v-6',
  'grip-vertical':
    'M9 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M9 5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M9 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M15 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M15 5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M15 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  'calendar-plus':
    'M16 19h6 M16 2v4 M19 16v6 M21 12.598V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8.5 M3 10h18 M8 2v4',
  upload: 'M12 3v12 M17 8l-5-5-5 5 M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
  save: 'M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7 M7 3v4a1 1 0 0 0 1 1h7',
  'layout-dashboard': 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  home: 'M3 12L12 3l9 9 M9 21V12h6v9',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  x: 'M18 6L6 18 M6 6l12 12',
  'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  'map-pin':
    'M12 2C8.7 2 6 4.7 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.3-2.7-6-6-6z M12 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3.128a4 4 0 0 1 0 7.744 M22 21v-2a4 4 0 0 0-3-3.87 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
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
  image:
    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21',
  palette:
    'M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z M13.5 7a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z M17.5 11a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z M6.5 13a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z M8.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z',
  'shield-alert':
    'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z M12 8v4 M12 16h.01',
  percent:
    'M19 5L5 19 M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  'undo-2':
    'M9 14L4 9l5-5 M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11',
  'at-sign':
    'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8',
  'square-check':
    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M9 12l2 2 4-4',
  paperclip:
    'm16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551',
  youtube:
    'M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z M9.75 15.02V8.48L15.5 11.75z',
  'check-check': 'M18 6L7 17l-5-5 M22 10l-7.5 7.5L13 16',
  trash:
    'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M3 6h18 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  'file-plus':
    'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z M14 2v5a1 1 0 0 0 1 1h5 M9 15h6 M12 18v-6',
  history:
    'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5 M12 7v5l4 2',
  'calendar-clock':
    'M16 14v2.2l1.6 1 M16 2v4 M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5 M3 10h5 M8 2v4 M16 22a6 6 0 1 0 0-12 6 6 0 0 0 0 12z',
  'rotate-ccw': 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5',
  'sliders-horizontal':
    'M10 5H3 M12 19H3 M14 3v4 M16 17v4 M21 12h-9 M21 19h-5 M21 5h-7 M8 10v4 M8 12H3',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0',
  'alert-circle':
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 8v4 M12 16h.01',
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

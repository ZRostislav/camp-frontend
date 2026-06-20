import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Общий спиннер загрузки.
 *
 * Использование на странице (вместо копипасты *ngIf="loading" блока):
 *
 *   <app-loading-spinner *ngIf="loading"></app-loading-spinner>
 *   <ng-container *ngIf="!loading"> ...контент страницы... </ng-container>
 *
 * По умолчанию растягивается на py-20 (как на dashboard).
 * Если нужна другая высота — передай [fullScreen]="true" для min-h-screen,
 * либо просто оберни в свой контейнер с нужным padding.
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="flex items-center justify-center"
      [class.py-20]="!fullScreen"
      [class.min-h-screen]="fullScreen"
    >
      <span
        class="border-camp-border border-t-camp-orange rounded-full inline-block animate-spin-btn"
        [style.width.px]="size"
        [style.height.px]="size"
        [style.borderWidth.px]="borderWidth"
      ></span>
    </div>
  `,
})
export class LoadingSpinnerComponent {
  /** Диаметр спиннера в px (по умолчанию как на dashboard — 32px / w-8 h-8) */
  @Input() size = 32;
  /** Толщина кольца в px (по умолчанию 3px) */
  @Input() borderWidth = 3;
  /** Растянуть на весь экран (min-h-screen) вместо просто py-20 */
  @Input() fullScreen = true;
}

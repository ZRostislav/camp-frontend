import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings.service';

/**
 * Общий спиннер загрузки.
 *
 *   <app-loading-spinner *ngIf="loading"></app-loading-spinner>
 *   <ng-container *ngIf="!loading"> ...контент страницы... </ng-container>
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
        class="rounded-full inline-block animate-spin"
        [style.width.px]="size"
        [style.height.px]="size"
        [style.borderWidth.px]="borderWidth"
        [style.borderStyle]="'solid'"
        [style.borderColor]="'var(--border-color)'"
        [style.borderTopColor]="campColor"
      ></span>
    </div>
  `,
})
export class LoadingSpinnerComponent implements OnInit {
  @Input() size = 32;
  @Input() borderWidth = 3;
  @Input() fullScreen = true;

  campColor = '#F59E0B';

  constructor(private settings: SettingsService) {}

  ngOnInit() {
    this.settings.get().subscribe({
      next: (d) => {
        this.campColor = (d['camp_color'] as string) ?? '#F59E0B';
      },
      error: () => {},
    });
  }
}

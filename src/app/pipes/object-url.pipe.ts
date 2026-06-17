import { Pipe, PipeTransform, OnDestroy } from '@angular/core';

/**
 * Pipe для превью локального File объекта в <img [src]>.
 * Использование: <img [src]="file | objectUrl">
 * Автоматически освобождает URL при уничтожении.
 */
@Pipe({ name: 'objectUrl', standalone: true, pure: false })
export class ObjectUrlPipe implements PipeTransform, OnDestroy {
  private currentUrl: string | null = null;
  private currentFile: File | null = null;

  transform(file: File | null): string {
    if (!file) return '';
    if (file === this.currentFile && this.currentUrl) return this.currentUrl;
    if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);
    this.currentFile = file;
    this.currentUrl = URL.createObjectURL(file);
    return this.currentUrl;
  }

  ngOnDestroy() {
    if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);
  }
}

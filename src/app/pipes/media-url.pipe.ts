import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Pipe для превращения относительного пути, который возвращает backend
 * (например "/uploads/abc123.jpg"), в абсолютный URL.
 * Использование: <img [src]="f.file_path | mediaUrl">
 *
 * Если путь уже абсолютный (http/https) — возвращается как есть.
 * environment.apiUrl оканчивается на "/api", а статика раздаётся с корня,
 * поэтому суффикс "/api" отрезается перед склейкой.
 */
@Pipe({ name: 'mediaUrl', standalone: true, pure: true })
export class MediaUrlPipe implements PipeTransform {
  private static readonly origin = environment.apiUrl.replace(/\/api\/?$/, '');

  transform(path: string | null | undefined): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return `${MediaUrlPipe.origin}${path.startsWith('/') ? '' : '/'}${path}`;
  }
}

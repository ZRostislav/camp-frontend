import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';
import { QrCodeService } from '../../services/qr-code.service';

/**
 * Модалка «QR для входа участника».
 *
 * Показывает QR-код, который открывает /login с подставленными
 * фамилией/именем участника — ребёнку остаётся только ввести код
 * доступа (или, если на телефоне уже есть сессия, его сразу перекинет
 * на нужную страницу). Код доступа в самой ссылке не передаётся.
 */
@Component({
  selector: 'app-qr-display-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './qr-display-modal.component.html',
})
export class QrDisplayModalComponent implements OnChanges {
  /** Показывать ли модалку */
  @Input() open = false;
  /** Ссылка, которую нужно закодировать в QR (см. QrCodeService.buildParticipantLoginLink) */
  @Input() link = '';
  /** Имя участника — для заголовка модалки */
  @Input() displayName = '';
  /** Акцентный цвет лагеря */
  @Input() campColor = '#1a5c38';
  @Input() onClose: () => void = () => {};

  dataUrl = '';
  generating = false;
  copyLabel = 'Скопировать ссылку';

  constructor(private qr: QrCodeService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['open'] || changes['link']) && this.open && this.link) {
      this.generate();
    }
    if (changes['open'] && !this.open) {
      this.copyLabel = 'Скопировать ссылку';
    }
  }

  private async generate(): Promise<void> {
    this.generating = true;
    try {
      this.dataUrl = await this.qr.toDataUrl(this.link);
    } finally {
      this.generating = false;
    }
  }

  async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.link);
      this.copyLabel = 'Скопировано!';
      setTimeout(() => (this.copyLabel = 'Скопировать ссылку'), 1800);
    } catch {
      // Буфер обмена недоступен (например, нет https) — молча игнорируем,
      // ссылка всё равно видна и её можно выделить вручную.
    }
  }

  close(): void {
    this.onClose();
  }
}

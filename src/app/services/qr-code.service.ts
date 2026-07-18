import { Injectable } from '@angular/core';
import * as QRCode from 'qrcode';

/**
 * Генерация QR-кодов для быстрого входа участника.
 *
 * Идея: ответственный (вожатый/админ) открывает профиль участника и
 * показывает QR. Ребёнок сканирует его своим телефоном — ссылка ведёт
 * на /login с уже подставленными фамилией/именем, остаётся только
 * ввести код доступа. Если на телефоне уже открыта чья-то сессия,
 * login.component сам решает, куда перейти (см. resolveLoggedInTarget
 * в login.component.ts) — сама ссылка НИКОГДА не содержит код доступа,
 * только фамилию/имя и id участника, поэтому она безопасна для показа
 * на экране/распечатки.
 */
@Injectable({ providedIn: 'root' })
export class QrCodeService {
  /** Рендерит QR-код в виде data:image/png;base64 URL. */
  async toDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
      width: 320,
      margin: 1,
      color: { dark: '#1c1917', light: '#ffffff' },
    });
  }

  /**
   * Ссылка для входа участника по QR.
   * Открывается на любом устройстве (в т.ч. iPhone) как обычная
   * страница /login — сканирование == переход по обычной https-ссылке,
   * поэтому дополнительных прав/приложений не требуется.
   */
  buildParticipantLoginLink(participant: {
    id: number | string;
    last_name?: string | null;
    first_name?: string | null;
  }): string {
    const params = new URLSearchParams({
      mode: 'participant',
      pid: String(participant.id),
      ln: participant.last_name ?? '',
      fn: participant.first_name ?? '',
    });
    return `${window.location.origin}/login?${params.toString()}`;
  }
}

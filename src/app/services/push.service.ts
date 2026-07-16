import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PushService {
  private api = environment.apiUrl;
  private readonly swPath = '/sw-push.js';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
  ) {}

  private headers() {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` });
  }

  /** Поддерживает ли браузер вообще Web Push (Safari на iPhone — только
   *  начиная с iOS 16.4, и только если сайт добавлен на экран «Домой»). */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /** Есть ли уже активная подписка в этом браузере (для отрисовки состояния кнопки). */
  async getExistingSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) return null;
    const registration = await navigator.serviceWorker.getRegistration(this.swPath);
    if (!registration) return null;
    return registration.pushManager.getSubscription();
  }

  /**
   * Полный цикл подписки:
   * 1. регистрирует service worker,
   * 2. спрашивает разрешение у пользователя,
   * 3. подписывается на PushManager с VAPID-ключом бэкенда,
   * 4. отправляет подписку на бэкенд для сохранения в БД.
   */
  async subscribeUser(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Браузер не поддерживает push-уведомления');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Уведомления не разрешены в браузере');
    }

    const registration = await navigator.serviceWorker.register(this.swPath);
    await navigator.serviceWorker.ready;

    const { publicKey } = await firstValueFrom(
      this.http.get<{ publicKey: string | null }>(`${this.api}/push/public-key`),
    );
    if (!publicKey) {
      throw new Error('Сервер не настроен для push-уведомлений (нет VAPID-ключа)');
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey),
      });
    }

    await firstValueFrom(
      this.http.post(`${this.api}/push/subscribe`, subscription.toJSON(), {
        headers: this.headers(),
      }),
    );
  }

  /** Отписка: убирает подписку и на устройстве, и на бэкенде. */
  async unsubscribeUser(): Promise<void> {
    const subscription = await this.getExistingSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    await firstValueFrom(
      this.http.delete(`${this.api}/push/subscribe`, {
        headers: this.headers(),
        body: { endpoint },
      }),
    );
  }

  /** Тестовое уведомление самому себе (на все свои подписки). */
  sendTest(message?: string) {
    return this.http.post<{ sent: number; expired: number }>(
      `${this.api}/push/test`,
      { message },
      { headers: this.headers() },
    );
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }
}

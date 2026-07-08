import { Injectable, OnDestroy } from '@angular/core';
import { Socket, io } from 'socket.io-client';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface RollcallEntryUpdatedEvent {
  rollcallId: number;
  entry: any;
}

export interface RollcallHouseConfirmedEvent {
  rollcallId: number;
  houseId: number;
  [key: string]: any;
}

export interface RollcallHousePenalizedEvent {
  rollcallId: number;
  houseId: number;
  [key: string]: any;
}

export interface RollcallCompletedEvent {
  rollcallId: number;
}

/**
 * Realtime-соединение для страницы переклички.
 *
 * Заменяет старый поллинг (GET /rollcalls/:id каждые 10 сек + отдельный
 * GET .../houses/:houseId/status на каждый домик). Вместо этого сервер сам
 * присылает событие в момент изменения — отметка статуса, подтверждение
 * домика, штраф, завершение переклички — и фронт обновляет только то, что
 * реально изменилось, без полного рефетча.
 *
 * Render free tier "засыпает" без трафика, из-за чего WebSocket-соединение
 * может обрываться. Socket.IO клиент переподключается автоматически — это
 * встроено в библиотеку (reconnection: true по умолчанию), нам нужно только
 * заново войти в комнату текущей переклички после реконнекта, что и делает
 * joinRollcall() при каждом вызове connect()/reconnect.
 */
@Injectable({ providedIn: 'root' })
export class RollcallSocketService implements OnDestroy {
  private socket: Socket | null = null;
  private currentRollcallId: number | null = null;

  readonly entryUpdated$ = new Subject<RollcallEntryUpdatedEvent>();
  readonly houseConfirmed$ = new Subject<RollcallHouseConfirmedEvent>();
  readonly housePenalized$ = new Subject<RollcallHousePenalizedEvent>();
  readonly rollcallCompleted$ = new Subject<RollcallCompletedEvent>();

  /** true, когда соединение установлено (для индикатора в UI, если нужен). */
  connected = false;

  constructor(private auth: AuthService) {}

  /** Подключается (если ещё не подключены) и входит в комнату переклички rollcallId. */
  connectAndJoin(rollcallId: number) {
    if (!this.socket) {
      this.createSocket();
    }
    this.currentRollcallId = rollcallId;
    // Если уже подключены — войдём в комнату сразу;
    // если соединение ещё устанавливается — войдём в обработчике 'connect'.
    if (this.socket?.connected) {
      this.socket.emit('rollcall:join', rollcallId);
    }
  }

  /** Покидает текущую перекличку (например, при переключении вкладки или уходе со страницы). */
  leaveCurrent() {
    if (this.socket?.connected && this.currentRollcallId) {
      this.socket.emit('rollcall:leave', this.currentRollcallId);
    }
    this.currentRollcallId = null;
  }

  /** Полностью закрывает соединение (вызывается при уходе со страницы переклички). */
  disconnect() {
    this.leaveCurrent();
    this.socket?.disconnect();
    this.socket = null;
    this.connected = false;
  }

  private createSocket() {
    // environment.apiUrl обычно заканчивается на "/api" — серверу Socket.IO
    // нужен сам origin без префикса.
    const origin = environment.apiUrl.replace(/\/api\/?$/, '');

    this.socket = io(origin, {
      auth: { token: this.auth.token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      // Render free tier дольше "просыпается", чем длится одна попытка —
      // не ограничиваем число попыток, чтобы клиент сам дождался поднятия сервера.
      reconnectionAttempts: Infinity,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      // (Пере)подключились — заново входим в комнату текущей переклички,
      // если она была выбрана (актуально после авто-реконнекта).
      if (this.currentRollcallId) {
        this.socket!.emit('rollcall:join', this.currentRollcallId);
      }
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
    });

    this.socket.on('entry:updated', (payload: RollcallEntryUpdatedEvent) => {
      this.entryUpdated$.next(payload);
    });

    this.socket.on('house:confirmed', (payload: RollcallHouseConfirmedEvent) => {
      this.houseConfirmed$.next(payload);
    });

    this.socket.on('house:penalized', (payload: RollcallHousePenalizedEvent) => {
      this.housePenalized$.next(payload);
    });

    this.socket.on('rollcall:completed', (payload: RollcallCompletedEvent) => {
      this.rollcallCompleted$.next(payload);
    });
  }

  ngOnDestroy() {
    this.disconnect();
  }
}

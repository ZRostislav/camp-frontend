import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsQR from 'jsqr';
import { IconComponent } from '../icon.component';

/**
 * Универсальный QR-сканер камерой устройства (в т.ч. iPhone/Safari).
 *
 * Почему не <input type="file" capture> и не сторонняя библиотека со своим
 * UI: getUserMedia + jsQR даёт полный контроль над видом окна сканера и
 * работает без обращения к внешним доменам (весь код — часть бандла).
 *
 * iOS-специфика, из-за которой видео может не воспроизвестись / уйти в
 * полноэкранный режим на iPhone, если их не учесть:
 *  - обязателен атрибут `playsinline` (без него Safari открывает видео
 *    на весь экран);
 *  - видео должно быть замьючено (`muted`), иначе autoplay заблокируется;
 *  - getUserMedia работает только в secure context (https или localhost).
 */
@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './qr-scanner.component.html',
})
export class QrScannerComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() campColor = '#1a5c38';
  @Output() closed = new EventEmitter<void>();
  /** Излучает распознанный текст QR-кода (обычно — URL) */
  @Output() scanned = new EventEmitter<string>();

  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  /** Ручной ввод — запасной вариант, если камера недоступна/запрещена */
  manualMode = false;
  manualValue = '';

  status: 'idle' | 'starting' | 'scanning' | 'error' = 'idle';
  errorMessage = '';

  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private alreadyEmitted = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      if (this.open) {
        this.alreadyEmitted = false;
        this.manualMode = false;
        this.manualValue = '';
        // Даём Angular отрисовать <video>/<canvas> перед стартом камеры.
        setTimeout(() => this.startCamera(), 0);
      } else {
        this.stopCamera();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  private async startCamera(): Promise<void> {
    this.status = 'starting';
    this.errorMessage = '';

    if (!navigator.mediaDevices?.getUserMedia) {
      this.status = 'error';
      this.errorMessage =
        'Камера недоступна в этом браузере. Введите ссылку вручную.';
      this.manualMode = true;
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
    } catch (err: any) {
      this.status = 'error';
      this.manualMode = true;
      if (err?.name === 'NotAllowedError') {
        this.errorMessage =
          'Доступ к камере запрещён. Разрешите камеру в настройках браузера или введите ссылку вручную.';
      } else if (err?.name === 'NotFoundError') {
        this.errorMessage = 'Камера не найдена на этом устройстве.';
      } else {
        this.errorMessage = 'Не удалось запустить камеру.';
      }
      return;
    }

    const video = this.videoRef?.nativeElement;
    if (!video) {
      this.stopCamera();
      return;
    }

    video.srcObject = this.stream;
    // playsInline — обязателен на iOS, иначе видео развернётся на весь экран.
    (video as any).playsInline = true;
    video.muted = true;

    try {
      await video.play();
    } catch {
      // Safari иногда бросает AbortError при быстром открытии/закрытии —
      // цикл сканирования всё равно запустится по next tick.
    }

    this.status = 'scanning';
    this.tick();
  }

  private tick = (): void => {
    if (this.status !== 'scanning' || !this.open) return;

    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code?.data && !this.alreadyEmitted) {
          this.alreadyEmitted = true;
          this.scanned.emit(code.data);
          this.stopCamera();
          return;
        }
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private stopCamera(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.status = 'idle';
  }

  submitManual(): void {
    const value = this.manualValue.trim();
    if (!value) return;
    this.scanned.emit(value);
  }

  retryCamera(): void {
    this.manualMode = false;
    this.errorMessage = '';
    setTimeout(() => this.startCamera(), 0);
  }

  close(): void {
    this.stopCamera();
    this.closed.emit();
  }
}

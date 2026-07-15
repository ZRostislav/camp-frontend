import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';
import { ObjectUrlPipe } from '../../pipes/object-url.pipe';
import { IconComponent } from '../../shared/icon.component';

// Страница домика — теперь работает по тому же принципу, что и профили
// участников/юзеров: универсальный компонент на роуты
//   - /house/my   → домик текущего пользователя (GET /houses/mine)
//   - /house/:id  → домик по id, доступно любому авторизованному (GET /houses/:id)
// Видимость access_code (кода доступа) полностью определяется бэкендом
// (см. src/utils/houseAccess.js) — фронт просто не рисует поле, если
// сервер его не прислал.
@Component({
  selector: 'app-house',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MediaUrlPipe,
    ObjectUrlPipe,
    IconComponent,
  ],
  templateUrl: './house.component.html',
  styleUrl: './house.component.css',
})
export class HouseComponent implements OnInit, OnDestroy {
  house: any = null;
  loading = true;
  error = '';
  msg = '';
  editing = false;
  editForm: any = { name: '', description: '', emoji: '' };
  editFiles: File[] = [];
  saving = false;

  campColor = '#F59E0B';

  /** true, если открыт роут /houses/my (а не /houses/:id) */
  viewingMine = false;

  /** id домика, закреплённого за текущим пользователем (для проверки прав
   *  на редактирование, когда смотрим чужой /houses/:id) */
  private myHouseId: number | null = null;

  private routeSub?: Subscription;

  private readonly roleLabels: Record<string, string> = {
    superadmin: 'Суперадмин',
    admin: 'Администратор',
    counselor: 'Вожатый',
    helper: 'Помощник',
    staff: 'Персонал',
  };

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private settings: SettingsService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
  ) {}

  /**
   * Возврат туда, откуда пришли (домашняя, рейтинг домиков и т.п.) —
   * обычная навигация назад по истории браузера, без жёстко зашитого
   * маршрута.
   */
  goBack() {
    this.location.back();
  }

  ngOnInit() {
    this.settings.get().subscribe({
      next: (d) => {
        this.campColor = (d['camp_color'] as string) ?? '#F59E0B';
      },
      error: () => {},
    });

    // Реагируем и на смену :id, и на смену data.mine (my <-> :id без
    // пересоздания компонента, если Angular его переиспользует)
    this.routeSub = combineLatest([
      this.route.paramMap,
      this.route.data,
    ]).subscribe(() => this.load());
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  load() {
    this.viewingMine = this.route.snapshot.data['mine'] === true;
    const id = this.route.snapshot.paramMap.get('id');

    if (!this.viewingMine) {
      // Мгновенная проверка, ещё ДО запроса /houses/:id — без похода
      // в API: у участника id домика уже в токене (currentUser().houseId),
      // у персонала — в кэше AuthService, прогретом предыдущими
      // refreshMyHouseAccess() (см. layout.component.ts). Если id совпал
      // (или буквально "my") — сразу редиректим, /house/2 даже не мигнёт.
      const myId = this.auth.getMyHouseId();
      if (id === 'my' || (myId != null && Number(id) === myId)) {
        this.router.navigate(['/house/my'], { replaceUrl: true });
        return;
      }
      this.myHouseId = myId;
    }

    this.loading = true;
    this.error = '';
    this.msg = '';
    this.editing = false;

    const endpoint = this.viewingMine ? '/houses/mine' : `/houses/${id}`;

    this.api.get(endpoint).subscribe({
      next: (d: any) => {
        this.house = d;
        this.resetEditForm();
        this.loading = false;
        this.resolveMyHouseId();
      },
      error: (e) => {
        this.error = e.error?.error || 'Ошибка загрузки';
        this.house = null;
        this.loading = false;
      },
    });
  }

  /**
   * Узнаём id "своего" домика — нужно и для проверки прав на
   * редактирование, и на случай, если синхронная проверка в load()
   * не сработала (кэш AuthService ещё не прогрелся — например, самая
   * первая навигация сразу после логина). В этом случае подтверждаем
   * через API и, если домик всё же оказался своим, редиректим постфактум.
   * Если мы и так на /house/my — id уже известен из this.house.
   */
  private resolveMyHouseId() {
    if (this.viewingMine) {
      this.myHouseId = this.house?.id ?? null;
      return;
    }
    if (this.myHouseId != null) {
      // Уже знаем из синхронной проверки в load() — и она не совпала
      // (иначе туда бы и не дошли), повторный запрос не нужен.
      return;
    }
    this.api.get('/houses/mine').subscribe({
      next: (d: any) => {
        this.myHouseId = d?.id ?? null;
        this.redirectIfOwnHouse();
      },
      error: () => (this.myHouseId = null),
    });
  }

  /**
   * Если открытый через /house/:id домик оказался твоим собственным —
   * переносим на канонический /house/my. Работает независимо от того,
   * откуда пришла ссылка (dashboard, список домиков, прямой ввод URL
   * и т.п.) — проверка централизована здесь, а не в каждом месте,
   * которое генерирует ссылку на домик.
   */
  private redirectIfOwnHouse() {
    if (
      !this.viewingMine &&
      this.myHouseId != null &&
      this.house?.id === this.myHouseId
    ) {
      this.router.navigate(['/house/my'], { replaceUrl: true });
    }
  }

  /** Можно ли редактировать открытый сейчас домик. */
  get canManageHouse(): boolean {
    if (!this.house) return false;
    if (this.auth.isAdmin()) return true;
    return (
      this.auth.role !== 'participant' &&
      this.myHouseId != null &&
      this.myHouseId === this.house.id
    );
  }

  startEdit() {
    this.resetEditForm();
    this.editing = true;
  }

  cancelEdit() {
    this.editing = false;
    this.editFiles = [];
    this.resetEditForm();
  }

  private resetEditForm() {
    this.editForm = {
      name: this.house?.name || '',
      description: this.house?.description || '',
      emoji: this.house?.emoji || '',
    };
    this.editFiles = [];
  }

  onEditAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.editFiles = [input.files[0]];
    this.editForm.emoji = '';
    input.value = '';
  }

  removeEditAvatar() {
    this.editFiles = [];
  }

  deleteAvatar() {
    if (!this.house?.id) return;
    this.saving = true;
    this.error = '';
    this.api.delete(`/houses/${this.house.id}/avatar`).subscribe({
      next: () => {
        this.msg = 'Аватар удален';
        this.saving = false;
        this.load();
      },
      error: (e: any) => {
        this.error = e.error?.error || 'Ошибка';
        this.saving = false;
      },
    });
  }

  saveEdit() {
    if (!this.house?.id || !this.editForm.name.trim()) {
      this.error = 'Укажите название домика';
      return;
    }

    this.saving = true;
    this.error = '';
    this.msg = '';

    this.api
      .put(`/houses/${this.house.id}`, {
        name: this.editForm.name.trim(),
        description: this.editForm.description || null,
        emoji: this.editForm.emoji || null,
      })
      .subscribe({
        next: () => {
          if (!this.editFiles.length) {
            this.finishSave();
            return;
          }

          const fd = new FormData();
          fd.append('avatar', this.editFiles[0]);
          this.api
            .postFormData(`/houses/${this.house.id}/avatar`, fd)
            .subscribe({
              next: () => this.finishSave(),
              error: (e: any) => {
                this.error = e.error?.error || 'Ошибка загрузки аватара';
                this.saving = false;
              },
            });
        },
        error: (e: any) => {
          this.error = e.error?.error || 'Ошибка';
          this.saving = false;
        },
      });
  }

  private finishSave() {
    this.msg = 'Домик сохранен';
    this.editing = false;
    this.saving = false;
    this.load();
  }

  get campColorBg(): string {
    return this.colorBg(this.campColor);
  }

  /** Цвет самого домика (если задан на бэкенде) — иначе общий campColor. */
  get houseColor(): string {
    return this.house?.color || this.campColor;
  }

  get houseColorBg(): string {
    return this.colorBg(this.houseColor);
  }

  private colorBg(hex: string, alpha = 0.1): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /** Заголовок H1: "Мой домик" на /houses/my, иначе — название домика. */
  get pageTitle(): string {
    if (this.viewingMine) return 'Мой домик';
    return this.house?.name || 'Домик';
  }

  /** Заголовок-подсказка под H1. */
  get subtitle(): string {
    if (!this.viewingMine) return 'Информация о домике';
    return this.auth.role === 'participant'
      ? 'Ваш домик и соседи по нему'
      : 'Домик, закреплённый за вами';
  }

  /** Текст для пустого состояния (домик не назначен / не найден). */
  get emptyMessage(): string {
    if (!this.viewingMine) {
      return 'Такого домика не существует.';
    }
    return this.auth.role === 'participant'
      ? 'Вас ещё не распределили в домик. Обратитесь к вожатому или администратору.'
      : 'За вами пока не закреплён домик. Обратитесь к администратору.';
  }

  roleLabel(role: string): string {
    return this.roleLabels[role] ?? role;
  }

  genderIcon(gender: string): string {
    return gender === 'м' ? '♂' : gender === 'ж' ? '♀' : '';
  }

  /**
   * Инициалы. Участники приходят как {last_name, first_name},
   * а ответственные (house.responsible) — только как {full_name}.
   */
  initials(p: any): string {
    if (p?.last_name || p?.first_name) {
      return [p.last_name, p.first_name]
        .filter(Boolean)
        .map((w: string) => w[0]?.toUpperCase())
        .join('');
    }
    if (p?.full_name) {
      return p.full_name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase())
        .join('');
    }
    return '';
  }

  fileSize(f: File) {
    const mb = f.size / 1024 / 1024;
    return mb < 1 ? `${(f.size / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
  }
}

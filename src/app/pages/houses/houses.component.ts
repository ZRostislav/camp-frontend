import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { ObjectUrlPipe } from '../../pipes/object-url.pipe';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-houses',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PickerComponent,
    ObjectUrlPipe,
    MediaUrlPipe,
    IconComponent,
  ],
  templateUrl: './houses.component.html',
  styleUrl: './houses.component.css',
})
export class HousesComponent implements OnInit {
  houses: any[] = [];
  selectedHouse: any = null;
  users: any[] = [];
  error = '';
  msg = '';

  campColor = '#F59E0B';

  get campColorBg(): string {
    return this.colorBg(this.campColor);
  }

  private colorBg(hex: string): string {
    const num = parseInt(hex.replace('#', ''), 16);
    return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},0.1)`;
  }

  /**
   * 1-й домик — исходный цвет.
   * Далее каждый шаг значительно светлее.
   * Максимум — почти цвет фона карточки.
   *
   * Раньше цвет "высветлялся" подмешиванием чистого белого (255,255,255) —
   * в тёмной теме это давало почти светящиеся белые пятна на тёмных
   * карточках вместо мягкого градиента. Теперь подмешиваем через CSS
   * color-mix() цвет самой карточки (var(--bg-card)) — браузер сам
   * посчитает нужный оттенок под текущую тему (светлая карточка в светлой
   * теме, тёмная — в тёмной), поэтому эффект "выцветания" по месту в
   * рейтинге одинаково хорошо смотрится в обеих темах.
   */
  houseColor(rankIndex: number): string {
    // 18% на шаг, максимум 75% "выцветания"
    const percent = Math.max(100 - rankIndex * 18, 25);
    return `color-mix(in srgb, ${this.campColor} ${percent}%, var(--bg-card) ${100 - percent}%)`;
  }

  houseColorBg(rankIndex: number): string {
    const num = parseInt(this.campColor.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;

    // Полупрозрачный фон — альфа-канал одинаково хорошо ложится и на
    // светлую, и на тёмную карточку, т.к. смешивается с реальным фоном
    // под ним в момент отрисовки, а не считается заранее в JS.
    const alpha = Math.max(0.03, 0.35 - rankIndex * 0.05);

    return `rgba(${r},${g},${b},${alpha})`;
  }

  houseBorderColor(rankIndex: number): string {
    const alphaPercent = Math.max(40 - rankIndex * 3, 15); // 40% → минимум 15%
    return `color-mix(in srgb, ${this.houseColor(rankIndex)} ${alphaPercent}%, transparent)`;
  }

  /** Режим отображения домиков: cards / list / compact */
  viewMode: 'cards' | 'list' | 'compact' = 'cards';

  /** Показывать ли форму создания (свёрнута по умолчанию, как у участников). */
  showCreateForm = false;

  // ── форма создания ───────────────────────────────────────────────────────
  form: any = { name: '', description: '', emoji: '' };
  formFiles: File[] = [];
  showFormEmojiPicker = false;

  // ── форма редактирования ─────────────────────────────────────────────────
  editItem: any = null;
  editFiles: File[] = [];
  showEditEmojiPicker = false;

  // ── ответственные ────────────────────────────────────────────────────────
  responsibleForm: any = { userId: '', rankLevel: 1 };

  avatarUploading = false;

  /**
   * Состояние модалки подтверждения для опасных действий
   * (удаление домика, удаление аватарки).
   */
  confirmState: {
    title: string;
    message: string;
    confirmLabel: string;
    danger: boolean;
    action: () => void;
  } | null = null;

  /** Домики, отсортированные по баллам (для подиума и рейтинга). */
  get sortedHouses(): any[] {
    return [...this.houses].sort(
      (a, b) => (b.house_points ?? 0) - (a.house_points ?? 0),
    );
  }

  get maxHousePoints(): number {
    return this.sortedHouses[0]?.house_points || 1;
  }

  get podiumOrder(): any[] {
    const s = this.sortedHouses;
    // 2 место слева, 1 место в центре (выше), 3 место справа — как на пьедестале
    return [s[1], s[0], s[2]].filter(Boolean);
  }

  rankBadge(i: number): string {
    return ['🥇', '🥈', '🥉'][i] || `${i + 1}`;
  }

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private settings: SettingsService,
    private elRef: ElementRef,
  ) {}

  ngOnInit() {
    this.settings.get().subscribe({
      next: (d) => {
        this.campColor = (d['camp_color'] as string) ?? '#F59E0B';
      },
      error: () => {},
    });
    this.load();
    if (this.auth.isAdmin()) {
      this.api
        .get('/users')
        .subscribe({ next: (d: any) => (this.users = d), error: () => {} });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.showFormEmojiPicker = false;
      this.showEditEmojiPicker = false;
    }
  }

  toggleFormEmojiPicker(e: MouseEvent) {
    e.stopPropagation();
    this.showFormEmojiPicker = !this.showFormEmojiPicker;
    this.showEditEmojiPicker = false;
  }
  toggleEditEmojiPicker(e: MouseEvent) {
    e.stopPropagation();
    this.showEditEmojiPicker = !this.showEditEmojiPicker;
    this.showFormEmojiPicker = false;
  }
  onFormEmojiSelect(e: any) {
    this.form.emoji = e.emoji.native;
    this.showFormEmojiPicker = false;
  }
  onEditEmojiSelect(e: any) {
    this.editItem.emoji = e.emoji.native;
    this.showEditEmojiPicker = false;
  }

  // ── avatar helpers ───────────────────────────────────────────────────────
  onFormAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.formFiles = [input.files[0]];
    this.form.emoji = ''; // картинка вытесняет эмодзи
    input.value = '';
  }
  removeFormAvatar() {
    this.formFiles = [];
  }

  onEditAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.editFiles = [input.files[0]];
    this.editItem.emoji = '';
    input.value = '';
  }
  removeEditAvatar() {
    this.editFiles = [];
  }

  load() {
    this.api.get('/houses').subscribe({
      next: (d: any) => (this.houses = d),
      error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  select(h: any) {
    this.api.get(`/houses/${h.id}`).subscribe({
      next: (d: any) => (this.selectedHouse = d),
      error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  closeDetails() {
    this.selectedHouse = null;
  }

  // ── Создание ─────────────────────────────────────────────────────────────
  create() {
    if (!this.form.name) {
      this.error = 'Укажите название';
      return;
    }
    this.api
      .post('/houses', {
        name: this.form.name,
        description: this.form.description || null,
        emoji: this.form.emoji || null,
      })
      .subscribe({
        next: (created: any) => {
          // Если выбрана картинка — загружаем аватарку
          if (this.formFiles.length) {
            const fd = new FormData();
            fd.append('avatar', this.formFiles[0]);
            this.api
              .postFormData(`/houses/${created.id}/avatar`, fd)
              .subscribe({ error: () => {} });
          }
          this.msg = 'Создан';
          this.form = { name: '', description: '', emoji: '' };
          this.formFiles = [];
          this.showFormEmojiPicker = false;
          this.showCreateForm = false;
          this.load();
        },
        error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
      });
  }

  // ── Редактирование ───────────────────────────────────────────────────────
  startEdit(h: any) {
    this.editItem = { ...h };
    this.editFiles = [];
    this.showEditEmojiPicker = false;
  }

  saveEdit() {
    const tasks: Promise<void>[] = [];

    // Сохраняем текстовые поля
    tasks.push(
      this.api
        .put(`/houses/${this.editItem.id}`, {
          name: this.editItem.name,
          description: this.editItem.description,
          emoji: this.editItem.emoji || null,
        })
        .toPromise()
        .then(() => {}),
    );

    // Если выбрана новая картинка — загружаем
    if (this.editFiles.length) {
      const fd = new FormData();
      fd.append('avatar', this.editFiles[0]);
      tasks.push(
        this.api
          .postFormData(`/houses/${this.editItem.id}/avatar`, fd)
          .toPromise()
          .then(() => {}),
      );
    }

    Promise.allSettled(tasks).then(() => {
      this.msg = 'Сохранено';
      this.editItem = null;
      this.editFiles = [];
      this.load();
      if (this.selectedHouse) this.select(this.selectedHouse);
    });
  }

  deleteAvatar(houseId: number) {
    this.confirmState = {
      title: 'Удалить аватарку?',
      message: 'Домик вернётся к эмодзи или иконке по умолчанию.',
      confirmLabel: 'Удалить',
      danger: true,
      action: () => this.doDeleteAvatar(houseId),
    };
  }

  private doDeleteAvatar(houseId: number) {
    this.api.delete(`/houses/${houseId}/avatar`).subscribe({
      next: () => {
        this.msg = 'Аватарка удалена';
        this.load();
        if (this.selectedHouse?.id === houseId) this.select(this.selectedHouse);
        if (this.editItem?.id === houseId) this.editItem.avatar_path = null;
      },
      error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  remove(id: number) {
    this.confirmState = {
      title: 'Удалить домик?',
      message:
        'Это действие необратимо. Участники домика останутся без домика.',
      confirmLabel: 'Удалить',
      danger: true,
      action: () => this.doRemove(id),
    };
  }

  private doRemove(id: number) {
    this.api.delete(`/houses/${id}`).subscribe({
      next: () => {
        this.msg = 'Удалён';
        this.selectedHouse = null;
        this.load();
      },
      error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  confirmYes() {
    const action = this.confirmState?.action;
    this.confirmState = null;
    action?.();
  }

  confirmNo() {
    this.confirmState = null;
  }

  // ── Ответственные ────────────────────────────────────────────────────────
  addResponsible() {
    this.api
      .post(
        `/houses/${this.selectedHouse.id}/responsible`,
        this.responsibleForm,
      )
      .subscribe({
        next: () => {
          this.msg = 'Добавлен';
          this.responsibleForm = { userId: '', rankLevel: 1 };
          this.select(this.selectedHouse);
        },
        error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
      });
  }

  removeResponsible(rId: number) {
    this.api
      .delete(`/houses/${this.selectedHouse.id}/responsible/${rId}`)
      .subscribe({
        next: () => {
          this.msg = 'Удалён';
          this.select(this.selectedHouse);
        },
        error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
      });
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  fileSize(f: File) {
    const mb = f.size / 1024 / 1024;
    return mb < 1 ? `${(f.size / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
  }
}

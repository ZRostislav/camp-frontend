import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ObjectUrlPipe } from '../../pipes/object-url.pipe';

@Component({
  selector: 'app-houses',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerComponent, ObjectUrlPipe],
  templateUrl: './houses.component.html',
})
export class HousesComponent implements OnInit {
  houses: any[] = [];
  selectedHouse: any = null;
  users: any[] = [];
  error = '';
  msg = '';

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

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private elRef: ElementRef,
  ) {}

  ngOnInit() {
    this.load();
    if (this.auth.isAdmin()) {
      this.api.get('/users').subscribe({ next: (d: any) => (this.users = d), error: () => {} });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.showFormEmojiPicker = false;
      this.showEditEmojiPicker = false;
    }
  }

  toggleFormEmojiPicker(e: MouseEvent) { e.stopPropagation(); this.showFormEmojiPicker = !this.showFormEmojiPicker; this.showEditEmojiPicker = false; }
  toggleEditEmojiPicker(e: MouseEvent) { e.stopPropagation(); this.showEditEmojiPicker = !this.showEditEmojiPicker; this.showFormEmojiPicker = false; }
  onFormEmojiSelect(e: any) { this.form.emoji = e.emoji.native; this.showFormEmojiPicker = false; }
  onEditEmojiSelect(e: any) { this.editItem.emoji = e.emoji.native; this.showEditEmojiPicker = false; }

  // ── avatar helpers ───────────────────────────────────────────────────────
  onFormAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.formFiles = [input.files[0]];
    this.form.emoji = ''; // картинка вытесняет эмодзи
    input.value = '';
  }
  removeFormAvatar() { this.formFiles = []; }

  onEditAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.editFiles = [input.files[0]];
    this.editItem.emoji = '';
    input.value = '';
  }
  removeEditAvatar() { this.editFiles = []; }

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

  // ── Создание ─────────────────────────────────────────────────────────────
  create() {
    if (!this.form.name) { this.error = 'Укажите название'; return; }
    this.api
      .post('/houses', { name: this.form.name, description: this.form.description || null, emoji: this.form.emoji || null })
      .subscribe({
        next: (created: any) => {
          // Если выбрана картинка — загружаем аватарку
          if (this.formFiles.length) {
            const fd = new FormData();
            fd.append('avatar', this.formFiles[0]);
            this.api.postFormData(`/houses/${created.id}/avatar`, fd).subscribe({ error: () => {} });
          }
          this.msg = 'Создан';
          this.form = { name: '', description: '', emoji: '' };
          this.formFiles = [];
          this.showFormEmojiPicker = false;
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
        .then(() => {})
    );

    // Если выбрана новая картинка — загружаем
    if (this.editFiles.length) {
      const fd = new FormData();
      fd.append('avatar', this.editFiles[0]);
      tasks.push(
        this.api.postFormData(`/houses/${this.editItem.id}/avatar`, fd).toPromise().then(() => {})
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
    if (!confirm('Удалить аватарку?')) return;
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
    if (!confirm('Удалить домик?')) return;
    this.api.delete(`/houses/${id}`).subscribe({
      next: () => { this.msg = 'Удалён'; this.selectedHouse = null; this.load(); },
      error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  // ── Ответственные ────────────────────────────────────────────────────────
  addResponsible() {
    this.api.post(`/houses/${this.selectedHouse.id}/responsible`, this.responsibleForm).subscribe({
      next: () => { this.msg = 'Добавлен'; this.responsibleForm = { userId: '', rankLevel: 1 }; this.select(this.selectedHouse); },
      error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  removeResponsible(rId: number) {
    this.api.delete(`/houses/${this.selectedHouse.id}/responsible/${rId}`).subscribe({
      next: () => { this.msg = 'Удалён'; this.select(this.selectedHouse); },
      error: (e: any) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  fileSize(f: File) {
    const mb = f.size / 1024 / 1024;
    return mb < 1 ? `${(f.size / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
  }
}

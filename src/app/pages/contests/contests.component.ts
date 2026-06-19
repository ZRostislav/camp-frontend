import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-contests',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PickerComponent,
    MediaUrlPipe,
    IconComponent,
    DatePipe,
  ],
  templateUrl: './contests.component.html',
  styleUrl: './contests.component.css',
})
export class ContestsComponent implements OnInit {
  contests: any[] = [];
  form: any = { emoji: '', title: '', description: '' };
  formFiles: File[] = [];
  formLinks: { url: string; label: string }[] = [];
  showFormEmojiPicker = false;
  showCreateForm = false;

  editItem: any = null;
  editFiles: File[] = [];
  editNewLinks: { url: string; label: string }[] = [];
  showEditEmojiPicker = false;

  error = '';
  msg = '';

  campColor = '#F59E0B';

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private elRef: ElementRef,
    private settings: SettingsService,
  ) {}

  ngOnInit() {
    this.settings.get().subscribe({
      next: (d) => {
        this.campColor = (d['camp_color'] as string) ?? '#F59E0B';
      },
      error: () => {},
    });
    this.load();
  }

  get campColorBg(): string {
    return this.hexToRgba(this.campColor, 0.1);
  }

  get completedCount(): number {
    return this.contests.filter((c) => c.status === 'completed').length;
  }

  get activeCount(): number {
    return this.contests.filter(
      (c) => c.status === 'in-progress' || c.status === 'active',
    ).length;
  }

  get upcomingCount(): number {
    return this.contests.filter((c) => c.status === 'upcoming').length;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.showFormEmojiPicker = false;
      this.showEditEmojiPicker = false;
    }
  }

  toggleFormEmojiPicker(event: MouseEvent) {
    event.stopPropagation();
    this.showFormEmojiPicker = !this.showFormEmojiPicker;
    this.showEditEmojiPicker = false;
  }

  toggleEditEmojiPicker(event: MouseEvent) {
    event.stopPropagation();
    this.showEditEmojiPicker = !this.showEditEmojiPicker;
    this.showFormEmojiPicker = false;
  }

  onFormEmojiSelect(event: any) {
    this.form.emoji = event.emoji.native;
    this.showFormEmojiPicker = false;
  }

  onEditEmojiSelect(event: any) {
    this.editItem.emoji = event.emoji.native;
    this.showEditEmojiPicker = false;
  }

  load() {
    this.api.get('/contests').subscribe({
      next: (d: any) => (this.contests = d),
      error: (e: any) => (this.error = e.error?.error || 'Ошибка загрузки'),
    });
  }

  onFormFilesChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.formFiles = this.mergeFiles(this.formFiles, Array.from(input.files));
    input.value = '';
  }

  removeFormFile(i: number) {
    this.formFiles = this.formFiles.filter((_, idx) => idx !== i);
  }

  onEditFilesChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.editFiles = this.mergeFiles(this.editFiles, Array.from(input.files));
    input.value = '';
  }

  removeEditFile(i: number) {
    this.editFiles = this.editFiles.filter((_, idx) => idx !== i);
  }

  private mergeFiles(existing: File[], incoming: File[]): File[] {
    const keys = new Set(existing.map((f) => `${f.name}__${f.size}`));
    return [
      ...existing,
      ...incoming.filter((f) => !keys.has(`${f.name}__${f.size}`)),
    ];
  }

  addFormLink() {
    this.formLinks.push({ url: '', label: '' });
  }
  removeFormLink(i: number) {
    this.formLinks = this.formLinks.filter((_, idx) => idx !== i);
  }
  addEditLink() {
    this.editNewLinks.push({ url: '', label: '' });
  }
  removeEditNewLink(i: number) {
    this.editNewLinks = this.editNewLinks.filter((_, idx) => idx !== i);
  }

  fileIcon(file: File | { file_type: string }): string {
    const type = 'file_type' in file ? file.file_type : (file as File).type;
    return type.startsWith('image') || type === 'image' ? '🖼️' : '🎬';
  }

  fileName(file: File | { original_name: string }): string {
    return 'original_name' in file ? file.original_name : (file as File).name;
  }

  fileSize(file: File): string {
    const mb = file.size / 1024 / 1024;
    return mb < 1
      ? `${(file.size / 1024).toFixed(0)} KB`
      : `${mb.toFixed(1)} MB`;
  }

  create() {
    if (!this.form.title) {
      this.error = 'Укажите название';
      return;
    }
    this.error = '';
    this.msg = '';

    this.api
      .post<any>('/contests', {
        emoji: this.form.emoji || null,
        title: this.form.title,
        description: this.form.description || null,
      })
      .subscribe({
        next: (created: any) => {
          const id = created.id;
          const tasks: Promise<void>[] = [];

          if (this.formFiles.length) {
            const fd = new FormData();
            this.formFiles.forEach((f) => fd.append('files', f));
            tasks.push(
              this.api
                .postFormData(`/contests/${id}/files`, fd)
                .toPromise()
                .then(() => {}),
            );
          }

          this.formLinks
            .filter((l) => l.url.trim())
            .forEach((l) => {
              tasks.push(
                this.api
                  .post(`/contests/${id}/youtube`, {
                    url: l.url.trim(),
                    label: l.label.trim() || null,
                  })
                  .toPromise()
                  .then(() => {}),
              );
            });

          Promise.allSettled(tasks).then(() => {
            this.msg = 'Конкурс создан';
            this.showCreateForm = false;
            this.resetForm();
            this.load();
          });
        },
        error: (e: any) => (this.error = e.error?.error || 'Ошибка создания'),
      });
  }

  resetForm() {
    this.form = { emoji: '', title: '', description: '' };
    this.formFiles = [];
    this.formLinks = [];
    this.showFormEmojiPicker = false;
  }

  startEdit(c: any) {
    this.editItem = {
      ...c,
      files: [...(c.files || [])],
      youtube_links: [...(c.youtube_links || [])],
    };
    this.editFiles = [];
    this.editNewLinks = [];
    this.showEditEmojiPicker = false;
  }

  saveEdit() {
    this.api
      .put(`/contests/${this.editItem.id}`, {
        emoji: this.editItem.emoji || null,
        title: this.editItem.title,
        description: this.editItem.description,
      })
      .subscribe({
        next: () => {
          const id = this.editItem.id;
          const tasks: Promise<void>[] = [];

          if (this.editFiles.length) {
            const fd = new FormData();
            this.editFiles.forEach((f) => fd.append('files', f));
            tasks.push(
              this.api
                .postFormData(`/contests/${id}/files`, fd)
                .toPromise()
                .then(() => {}),
            );
          }

          this.editNewLinks
            .filter((l) => l.url.trim())
            .forEach((l) => {
              tasks.push(
                this.api
                  .post(`/contests/${id}/youtube`, {
                    url: l.url.trim(),
                    label: l.label.trim() || null,
                  })
                  .toPromise()
                  .then(() => {}),
              );
            });

          Promise.allSettled(tasks).then(() => {
            this.msg = 'Сохранено';
            this.editItem = null;
            this.editFiles = [];
            this.editNewLinks = [];
            this.load();
          });
        },
        error: (e: any) => (this.error = e.error?.error || 'Ошибка сохранения'),
      });
  }

  deleteFile(contestId: number, fileId: number) {
    if (!confirm('Удалить файл?')) return;
    this.api.delete(`/contests/${contestId}/files/${fileId}`).subscribe({
      next: () => {
        this.msg = 'Файл удалён';
        if (this.editItem)
          this.editItem.files = this.editItem.files.filter(
            (f: any) => f.id !== fileId,
          );
        this.load();
      },
      error: (e: any) =>
        (this.error = e.error?.error || 'Ошибка удаления файла'),
    });
  }

  deleteYoutubeLink(contestId: number, linkId: number) {
    if (!confirm('Удалить ссылку?')) return;
    this.api.delete(`/contests/${contestId}/youtube/${linkId}`).subscribe({
      next: () => {
        this.msg = 'Ссылка удалена';
        if (this.editItem)
          this.editItem.youtube_links = this.editItem.youtube_links.filter(
            (l: any) => l.id !== linkId,
          );
        this.load();
      },
      error: (e: any) =>
        (this.error = e.error?.error || 'Ошибка удаления ссылки'),
    });
  }

  remove(id: number) {
    if (!confirm('Удалить конкурс?')) return;
    this.api.delete(`/contests/${id}`).subscribe({
      next: () => {
        this.msg = 'Удалён';
        this.load();
      },
      error: (e: any) => (this.error = e.error?.error || 'Ошибка удаления'),
    });
  }
}

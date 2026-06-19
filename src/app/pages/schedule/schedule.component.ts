import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { IconComponent } from '../../shared/icon.component';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    DragDropModule,
    PickerComponent,
    IconComponent,
  ],
  templateUrl: './schedule.component.html',
})
export class ScheduleComponent implements OnInit {
  items: any[] = [];
  form: any = { time: '', title: '', emoji: '' };
  editItem: any = null;
  error = '';
  msg = '';
  showForm = false;

  showFormEmojiPicker = false;
  showEditEmojiPicker = false;

  campColor = '#F59E0B';
  today = new Date();

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
    this.error = '';
    this.msg = '';
    this.api.get('/schedule').subscribe({
      next: (d: any) => {
        this.items = d.sort((a: any, b: any) => a.order_index - b.order_index);
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  /** Index of the currently active schedule item based on current time */
  get activeIndex(): number {
    if (!this.items.length) return -1;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let active = -1;
    for (let i = 0; i < this.items.length; i++) {
      const t = this.parseTime(this.items[i].time);
      if (t !== null && t <= nowMinutes) active = i;
    }
    return active;
  }

  get campColorBg(): string {
    return this.hexToRgba(this.campColor, 0.1);
  }

  get campColorLight(): string {
    return this.hexToRgba(this.campColor, 0.08);
  }

  drop(event: CdkDragDrop<any[]>) {
    if (!this.auth.isAdmin()) return;
    moveItemInArray(this.items, event.previousIndex, event.currentIndex);
    this.items.forEach((item, index) => {
      item.order_index = index + 1;
    });
    this.syncOrder();
  }

  syncOrder() {
    const payload = { order: this.items.map((i) => i.id) };
    this.api.put('/schedule/reorder', payload).subscribe({
      next: () => {
        this.msg = 'Порядок обновлён';
        this.load();
      },
      error: (e) =>
        (this.error = e.error?.error || 'Ошибка при сохранении порядка'),
    });
  }

  create() {
    this.api.post('/schedule', this.form).subscribe({
      next: () => {
        this.msg = 'Пункт добавлен';
        this.form = { time: '', title: '', emoji: '' };
        this.showForm = false;
        this.showFormEmojiPicker = false;
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  startEdit(s: any) {
    this.editItem = { ...s };
    this.showEditEmojiPicker = false;
  }

  saveEdit() {
    this.api
      .put(`/schedule/${this.editItem.id}`, {
        time: this.editItem.time,
        title: this.editItem.title,
        emoji: this.editItem.emoji,
        orderIndex: this.editItem.order_index,
      })
      .subscribe({
        next: () => {
          this.editItem = null;
          this.msg = 'Изменения сохранены';
          this.load();
        },
        error: (e) => (this.error = e.error?.error || 'Ошибка'),
      });
  }

  remove(id: number) {
    if (!confirm('Удалить пункт?')) return;
    this.api.delete(`/schedule/${id}`).subscribe({
      next: () => {
        this.msg = 'Пункт удалён';
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }

  private parseTime(timeStr: string): number | null {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
}

import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, PickerComponent],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.css'],
})
export class ScheduleComponent implements OnInit {
  items: any[] = [];
  form: any = { time: '', title: '', emoji: '' };
  editItem: any = null;
  error = '';
  msg = '';

  showFormEmojiPicker = false;
  showEditEmojiPicker = false;

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private elRef: ElementRef,
  ) {}

  ngOnInit() {
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
    this.api.get('/schedule').subscribe({
      next: (d: any) => {
        this.items = d.sort((a: any, b: any) => a.order_index - b.order_index);
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
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
        this.msg = 'Порядок обновлен';
        this.load();
      },
      error: (e) =>
        (this.error = e.error?.error || 'Ошибка при сохранении порядка'),
    });
  }

  create() {
    this.api.post('/schedule', this.form).subscribe({
      next: () => {
        this.msg = 'Добавлено';
        this.form = { time: '', title: '', emoji: '' };
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
          this.msg = 'Сохранено';
          this.load();
        },
        error: (e) => (this.error = e.error?.error || 'Ошибка'),
      });
  }

  remove(id: number) {
    if (!confirm('Удалить пункт?')) return;
    this.api.delete(`/schedule/${id}`).subscribe({
      next: () => {
        this.msg = 'Удалено';
        this.load();
      },
      error: (e) => (this.error = e.error?.error || 'Ошибка'),
    });
  }
}

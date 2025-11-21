import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UserAccount } from '../models';

export type SidebarView = 'dashboard' | 'requests' | 'create-request' | 'users' | 'notifications';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  @Input() activeView: SidebarView = 'dashboard';
  @Input() user: UserAccount | null = null;

  @Output() viewChange = new EventEmitter<SidebarView>();
  @Output() logout = new EventEmitter<void>();
  @Output() closeMenu = new EventEmitter<void>();

  changeView(view: SidebarView) {
    this.viewChange.emit(view);
    this.closeMenu.emit();
  }

  handleLogout() {
    this.logout.emit();
    this.closeMenu.emit();
  }
}

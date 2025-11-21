import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '../services/user.service';
import { AddAdminUserCommand, GetUsersWithPaginationQuery, RoleItemDto, UserDto, UserTypeEnum } from './user-api.models';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css',
})
export class UserManagementComponent implements OnInit {
  filters = signal<GetUsersWithPaginationQuery>({ pageNumber: 1, pageSize: 10, searchTerm: '', userType: 'AdminUser' });
  users = signal<UserDto[]>([]);
  loading = signal(false);
  error = signal('');
  success = signal('');
  roles = signal<RoleItemDto[]>([]);
  showCreateModal = signal(false);

  adminForm = signal<AddAdminUserCommand>({
    email: '',
    fullName: '',
    phoneNumber: '',
    nationalId: '',
    password: 'Temp@12345',
    roles: [],
  });

  constructor(private readonly userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  loadUsers() {
    this.loading.set(true);
    this.error.set('');
    this.userService.getUsersWithPagination(this.filters()).subscribe({
      next: (response) => {
        this.users.set(response.items ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Unable to load users.');
        this.loading.set(false);
      },
    });
  }

  loadRoles() {
    this.userService.getActiveInternalRoles().subscribe({
      next: (roles) => this.roles.set(roles ?? []),
      error: (err) => this.error.set(err?.error?.message || 'Unable to load roles.'),
    });
  }

  updateFilter(field: keyof GetUsersWithPaginationQuery, value: any) {
    this.filters.set({ ...this.filters(), [field]: value });
    this.loadUsers();
  }

  updateAdmin(field: keyof AddAdminUserCommand, value: any) {
    this.adminForm.set({ ...this.adminForm(), [field]: value });
  }

  updateRoles(value: number[] | string[]) {
    const selectedRoles = (value || []) as (number | string)[];
    const roles = selectedRoles
      .filter((role) => role !== null && role !== undefined && role !== '')
      .map((role) => Number(role));

    this.adminForm.set({ ...this.adminForm(), roles });
  }

  submitAdmin() {
    this.error.set('');
    this.success.set('');
    const payload = this.adminForm();

    this.userService.addAdmin(payload).subscribe({
      next: (response) => {
        this.success.set(`User ${payload.fullName || payload.email} created (id: ${response.userId}).`);
        this.adminForm.set({ email: '', fullName: '', phoneNumber: '', nationalId: '', password: 'Temp@12345', roles: [] });
        this.showCreateModal.set(false);
        this.loadUsers();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Unable to add admin user.');
      },
    });
  }

  openCreateDialog() {
    this.showCreateModal.set(true);
  }

  closeCreateDialog() {
    this.showCreateModal.set(false);
  }

  toggleUser(user: UserDto) {
    if (this.isSuperAdmin(user)) {
      this.error.set('SuperAdmin accounts cannot be disabled.');
      return;
    }

    this.userService.toggleUserStatus({ userId: user.id }).subscribe({
      next: () => {
        this.success.set(`User ${user.fullName || user.email} is now ${user.isActive ? 'inactive' : 'active'}.`);
        this.loadUsers();
      },
      error: (err) => this.error.set(err?.error?.message || 'Unable to toggle status.'),
    });
  }

  deleteUser(user: UserDto) {
    if (this.isSuperAdmin(user)) {
      this.error.set('SuperAdmin accounts cannot be deleted.');
      return;
    }

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.success.set(`User ${user.fullName || user.email} deleted.`);
        this.loadUsers();
      },
      error: (err) => this.error.set(err?.error?.message || 'Unable to delete user.'),
    });
  }

  roleLabel(user: UserDto) {
    return user.rolesNames?.length ? user.rolesNames.join(', ') : '—';
  }

  currentStatus(user: UserDto) {
    return user.isActive ? 'Active' : 'Suspended';
  }

  isSuperAdmin(user: UserDto) {
    return (user.rolesNames || []).some((role) => role.toLowerCase() === 'superadmin');
  }

  userTypes(): UserTypeEnum[] {
    return ['AdminUser', 'SuperAdmin', 'NormalUser'];
  }
}

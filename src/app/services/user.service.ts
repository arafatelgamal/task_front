import { Injectable, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { WorkflowService } from '../workflow.service';
import {
  AddAdminUserCommand,
  AddAdminUserResultDto,
  GetUsersWithPaginationQuery,
  RoleItemDto,
  UpdateUserCommand,
  UserDto,
  UserResponse,
  UserTypeEnum,
} from '../users/user-api.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly rolesCatalog: RoleItemDto[] = [
    { value: 1, label: 'Facilities Manager' },
    { value: 2, label: 'Technician' },
    { value: 3, label: 'Employee' },
  ];

  private users = signal<UserDto[]>(this.seedFromWorkflow());

  constructor(private readonly workflow: WorkflowService) {}

  addAdmin(command: AddAdminUserCommand): Observable<AddAdminUserResultDto> {
    const nextId = (this.users()[0]?.id ?? 400) + 1;
    const rolesNames = this.rolesCatalog
      .filter((role) => command.roles.includes(role.value))
      .map((role) => role.label);

    const newUser: UserDto = {
      id: nextId,
      email: command.email,
      fullName: command.fullName,
      phoneNumber: command.phoneNumber,
      nationalId: command.nationalId,
      rolesNames,
      roles: command.roles,
      joinedDate: new Date().toISOString(),
      isActive: true,
    };

    this.users.set([newUser, ...this.users()]);
    return of({ userId: nextId });
  }

  getUserById(id: number): Observable<UserDto> {
    const found = this.users().find((user) => user.id === id);
    if (!found) return throwError(() => new Error('User not found'));
    return of(found);
  }

  updateUser(command: UpdateUserCommand): Observable<UserDto> {
    const updatedUsers = this.users().map((user) => (user.id === command.id ? { ...user, ...command } : user));
    const updated = updatedUsers.find((u) => u.id === command.id);
    if (!updated) return throwError(() => new Error('User not found'));
    this.users.set(updatedUsers as UserDto[]);
    return of(updated);
  }

  deleteUser(id: number): Observable<string> {
    this.users.set(this.users().filter((user) => user.id !== id));
    return of('Deleted');
  }

  toggleUserStatus(command: { userId: number }): Observable<string> {
    this.users.update((current) =>
      current.map((user) =>
        user.id === command.userId
          ? {
              ...user,
              isActive: !user.isActive,
            }
          : user
      )
    );
    return of('Toggled');
  }

  getUsersList(searchTerm?: string, userType?: UserTypeEnum): Observable<UserDto[]> {
    return of(this.filterUsers(searchTerm, userType));
  }

  getUsersWithPagination(query: GetUsersWithPaginationQuery): Observable<UserResponse> {
    const filtered = this.filterUsers(query.searchTerm, query.userType);
    return of({ items: filtered.slice(0, query.pageSize) });
  }

  getActiveInternalRoles(): Observable<RoleItemDto[]> {
    return of(this.rolesCatalog.filter((role) => role.label !== 'SuperAdmin'));
  }

  private filterUsers(searchTerm?: string, _userType?: UserTypeEnum) {
    const term = (searchTerm || '').toLowerCase();
    const list = term
      ? this.users().filter((user) =>
          [user.email, user.fullName, user.phoneNumber].some((field) => (field || '').toLowerCase().includes(term))
        )
      : this.users();

    return list;
  }

  private seedFromWorkflow(): UserDto[] {
    return this.workflow.listUsers().map((user) => ({
      id: user.id,
      email: user.email || `${user.name.replace(/\s+/g, '.').toLowerCase()}@example.com`,
      fullName: user.name,
      phoneNumber: user.phoneNumber,
      nationalId: '',
      rolesNames: [user.role],
      roles: [user.role === 'manager' ? 1 : user.role === 'technician' ? 2 : 3],
      joinedDate: user.createdAt.toISOString(),
      isActive: user.status === 'Active',
    }));
  }
}

import { Injectable, signal } from '@angular/core';
import { map, switchMap, tap } from 'rxjs';
import { AssetRequest, UserAccount, UserRole, WorkflowNotification } from './models';
import {
  CompleteAssetRequestCommand,
  CreateAssetRequestCommand,
  GetAssetRequestsQuery,
  ReviewAssetRequestCommand,
  mapToAssetRequest,
} from './requests/asset-request.models';
import { AssetRequestsService } from './services/asset-requests.service';
import { NotificationsService } from './services/notifications.service';
import { UserService } from './services/user.service';
import { ApiResponse } from './shared/api-response';
import { NotificationDto } from './notifications/notification-api.models';
import { UserDto, UserTypeEnum } from './users/user-api.models';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private notificationId = 0;
  private userId = 0;
  private lastRequestQuery: GetAssetRequestsQuery = { onlyMine: true };

  currentUser = signal<UserAccount | null>(null);
  users = signal<UserAccount[]>([]);
  requests = signal<AssetRequest[]>([]);
  notifications = signal<WorkflowNotification[]>([]);

  constructor(
    private readonly assetRequests: AssetRequestsService,
    private readonly usersApi: UserService,
    private readonly notificationsApi: NotificationsService,
  ) {}

  login(phoneNumber: string, password: string): UserAccount {
    const user = this.users().find(
      (candidate) =>
        candidate.phoneNumber === phoneNumber && candidate.password === password && candidate.status === 'Active'
    );

    if (!user) {
      throw new Error('Invalid credentials or inactive user');
    }

    this.currentUser.set(user);
    this.addNotification(user.role, `Signed in as ${user.name}.`, undefined);
    return user;
  }

  setAuthenticatedAdmin(user: {
    id: number;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    role?: string;
    userType?: string | number;
    permissions?: string[];
    joinedDate?: string | Date;
    isActive?: boolean;
  }): UserAccount {
    const normalizedRole = this.normalizeRole(user);

    const mappedUser: UserAccount = {
      id: user.id,
      name: user.fullName || user.email || `Admin ${user.id}`,
      phoneNumber: user.phoneNumber || '',
      email: user.email,
      role: normalizedRole,
      permissions: user.permissions ?? [],
      status: user.isActive === false ? 'Suspended' : 'Active',
      password: '',
      createdAt: user.joinedDate ? new Date(user.joinedDate) : new Date(),
    };

    this.currentUser.set(mappedUser);

    if (!this.users().some((u) => u.id === mappedUser.id)) {
      this.users.set([...this.users(), mappedUser]);
    }

    this.addNotification(mappedUser.role, `Signed in as ${mappedUser.name}.`, undefined);
    this.loadUsersFromApi();
    this.loadNotifications();
    return mappedUser;
  }

  private normalizeRole(user: { role?: string; userType?: string | number }): UserRole {
    const roleFromApi = (user.role || '').trim().toLowerCase();
    if (roleFromApi.includes('tech')) return 'technician';
    if (roleFromApi.includes('employee')) return 'employee';
    if (roleFromApi.includes('manager')) return 'manager';

    const userType = `${user.userType ?? ''}`.trim();
    if (userType === '2') return 'employee';
    if (userType === '3') return 'technician';

    return 'manager';
  }

  logout() {
    this.currentUser.set(null);
  }

  getTechnicians(): UserAccount[] {
    return this.users().filter((user) => user.role === 'technician' && user.status === 'Active');
  }

  listUsers(): UserAccount[] {
    return this.users();
  }

  addUser(payload: Omit<UserAccount, 'id' | 'createdAt' | 'permissions'> & { permissions?: string[] }): UserAccount {
    const actor = this.currentUser();
    if (!actor || actor.role !== 'manager') {
      throw new Error('Only managers can create users.');
    }

    this.userId += 1;
    const permissions = payload.permissions?.length
      ? payload.permissions
      : payload.role === 'manager'
        ? ['requests:review', 'users:manage', 'notifications:view']
        : payload.role === 'technician'
          ? ['requests:complete', 'notifications:view']
          : ['requests:create', 'notifications:view'];

    const nextUser: UserAccount = {
      ...payload,
      permissions,
      id: this.userId,
      createdAt: new Date(),
    };

    this.users.set([nextUser, ...this.users()]);
    this.addNotification('manager', `${nextUser.name} was created.`, undefined);
    return nextUser;
  }

  loadRequests(query?: GetAssetRequestsQuery) {
    const merged: GetAssetRequestsQuery = {
      ...this.lastRequestQuery,
      ...query,
      status: query?.status ?? this.lastRequestQuery.status,
    };
    this.lastRequestQuery = merged;

    return this.assetRequests.getList(merged).pipe(
      tap((response) => {
        const payload = this.unwrap(response);
        const mapped = payload.requests?.map(mapToAssetRequest) ?? [];
        this.requests.set(mapped);
      })
    );
  }

  createRequest(command: CreateAssetRequestCommand) {
    return this.assetRequests
      .create(command)
      .pipe(switchMap(() => this.loadRequests(this.lastRequestQuery)));
  }

  reviewRequest(requestId: number, command: ReviewAssetRequestCommand) {
    return this.assetRequests
      .review(requestId, command)
      .pipe(switchMap(() => this.loadRequests(this.lastRequestQuery)));
  }

  completeRequest(requestId: number, command: CompleteAssetRequestCommand) {
    return this.assetRequests
      .complete(requestId, command)
      .pipe(switchMap(() => this.loadRequests(this.lastRequestQuery)));
  }

  archiveRejected(requestId: number): void {
    const updated = this.requests().map((req) =>
      req.id === requestId && req.status === 'Rejected'
        ? {
            ...req,
            status: 'Archived' as const,
            history: [...req.history, { label: 'Archived by manager', at: new Date() }],
          }
        : req
    );
    this.requests.set(updated);
  }

  private addNotification(audience: UserRole, message: string, relatedRequestId?: number) {
    this.notificationId += 1;
    this.notifications.set([
      {
        id: this.notificationId,
        audience,
        message,
        createdAt: new Date(),
        relatedRequestId,
      },
      ...this.notifications(),
    ]);
  }

  private loadUsersFromApi() {
    this.usersApi
      .getUsersList(undefined, 'AdminUser' satisfies UserTypeEnum)
      .pipe(map((users) => users ?? []))
      .subscribe({
        next: (users) => {
          const mapped = users.map((user) => this.mapUserDto(user)).filter(Boolean) as UserAccount[];
          this.users.set(mapped);
        },
      });
  }

  private loadNotifications() {
    this.notificationsApi
      .getAdminNotifications({ pageNumber: 1, pageSize: 20, onlyUnread: false })
      .pipe(map((response) => this.unwrap(response).items ?? []))
      .subscribe({
        next: (items) => {
          const mapped = items.map((item) => this.mapNotification(item));
          this.notificationId = Math.max(this.notificationId, ...mapped.map((n) => n.id), 0);
          this.notifications.set(mapped);
        },
      });
  }

  private mapUserDto(user: UserDto): UserAccount {
    const role = this.normalizeRole(user);
    const permissions = this.derivePermissions(role);

    this.userId = Math.max(this.userId, user.id);

    return {
      id: user.id,
      name: user.fullName || user.email || `Admin ${user.id}`,
      phoneNumber: user.phoneNumber || '',
      email: user.email,
      role,
      permissions,
      status: user.isActive === false ? 'Suspended' : 'Active',
      password: '',
      createdAt: user.joinedDate ? new Date(user.joinedDate) : new Date(),
    };
  }

  private mapNotification(item: NotificationDto): WorkflowNotification {
    const audience = this.currentUser()?.role ?? 'manager';
    return {
      id: item.id,
      audience,
      message: item.message || item.title || 'New notification',
      createdAt: new Date(item.createdAt),
      relatedRequestId: item.typeId ?? undefined,
    };
  }

  private unwrap<T>(response: ApiResponse<T> | T): T {
    return (response as ApiResponse<T>).data ?? (response as T);
  }

  private derivePermissions(role: UserRole): string[] {
    if (role === 'manager') return ['requests:review', 'users:manage', 'notifications:view'];
    if (role === 'technician') return ['requests:complete', 'notifications:view'];
    return ['requests:create', 'notifications:view'];
  }
}

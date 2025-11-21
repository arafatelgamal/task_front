import { Injectable, signal } from '@angular/core';
import { switchMap, tap } from 'rxjs';
import { AssetRequest, UserAccount, UserRole, WorkflowNotification } from './models';
import { CompleteAssetRequestCommand, CreateAssetRequestCommand, GetAssetRequestsQuery, ReviewAssetRequestCommand, mapToAssetRequest } from './requests/asset-request.models';
import { AssetRequestsService } from './services/asset-requests.service';
import { ApiResponse } from './shared/api-response';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private notificationId = 3;
  private userId = 402;
  private lastRequestQuery: GetAssetRequestsQuery = { onlyMine: true };

  private readonly seedUsers: UserAccount[] = [
    {
      id: 201,
      name: 'Yousef Employee',
      phoneNumber: '+966500000000',
      email: 'yousef@example.com',
      role: 'employee',
      permissions: ['requests:create', 'notifications:view'],
      status: 'Active',
      password: 'Employee@12345',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180),
    },
    {
      id: 301,
      name: 'Facilities Manager',
      phoneNumber: '+966500000100',
      email: 'manager@example.com',
      role: 'manager',
      permissions: ['requests:review', 'users:manage', 'notifications:view'],
      status: 'Active',
      password: 'Manager@12345',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 300),
    },
    {
      id: 401,
      name: 'Ali - HVAC',
      phoneNumber: '+966500000001',
      email: 'ali.hvac@example.com',
      role: 'technician',
      permissions: ['requests:complete', 'notifications:view'],
      status: 'Active',
      password: 'Tech@12345',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120),
    },
    {
      id: 402,
      name: 'Sara - Electrical',
      phoneNumber: '+966500000002',
      email: 'sara.electrical@example.com',
      role: 'technician',
      permissions: ['requests:complete', 'notifications:view'],
      status: 'Active',
      password: 'Tech@12345',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90),
    },
  ];

  currentUser = signal<UserAccount | null>(null);
  users = signal<UserAccount[]>([...this.seedUsers]);
  requests = signal<AssetRequest[]>([]);
  notifications = signal<WorkflowNotification[]>([
    {
      id: 1,
      audience: 'manager',
      message: 'Pending approval: Office AC Unit',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 11),
      relatedRequestId: 1,
    },
    {
      id: 2,
      audience: 'technician',
      message: 'Sara - Electrical, you were assigned to 3D Printer',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 23),
      relatedRequestId: 2,
    },
  ]);

  constructor(private readonly assetRequests: AssetRequestsService) {}

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
    permissions?: string[];
    joinedDate?: string | Date;
    isActive?: boolean;
  }): UserAccount {
    const normalizedRole: UserRole = user.role === 'technician' || user.role === 'employee' ? user.role : 'manager';

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
    return mappedUser;
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

  private unwrap<T>(response: ApiResponse<T> | T): T {
    return (response as ApiResponse<T>).data ?? (response as T);
  }
}

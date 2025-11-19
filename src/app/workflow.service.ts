import { Injectable, signal } from '@angular/core';
import {
  AssetLifecycleStatus,
  AssetRequest,
  UserAccount,
  UserRole,
  WorkflowNotification,
} from './models';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private notificationId = 3;
  private requestId = 2;
  private userId = 402;

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

  private readonly seedRequests: AssetRequest[] = [
    {
      id: 1,
      assetName: 'Office AC Unit',
      assetPhoto:
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=60',
      description: 'The main meeting room AC is blowing warm air.',
      status: 'PendingReview',
      employeeName: 'Yousef Employee',
      createdByUserId: 201,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
      history: [
        { label: 'Employee submitted request', at: new Date(Date.now() - 1000 * 60 * 60 * 12) },
      ],
    },
    {
      id: 2,
      assetName: '3D Printer',
      assetPhoto:
        'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=60',
      description: 'The printer nozzle is clogged and needs maintenance.',
      status: 'InProgress',
      employeeName: 'Laila External',
      technicianId: 402,
      technicianName: 'Sara - Electrical',
      managerNote: 'Approved and routed to electrical technician.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      history: [
        { label: 'Employee submitted request', at: new Date(Date.now() - 1000 * 60 * 60 * 24) },
        { label: 'Manager approved and assigned Sara', at: new Date(Date.now() - 1000 * 60 * 60 * 23) },
      ],
    },
  ];

  currentUser = signal<UserAccount | null>(null);
  users = signal<UserAccount[]>([...this.seedUsers]);
  requests = signal<AssetRequest[]>([...this.seedRequests]);
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

  createRequest(command: {
    assetName: string;
    assetPhoto?: string;
    assetPhotoName?: string;
    description?: string;
  }): AssetRequest {
    const user = this.currentUser();
    if (!user || user.role !== 'employee') {
      throw new Error('Only employees can add requests.');
    }

    this.requestId += 1;
    const request: AssetRequest = {
      id: this.requestId,
      assetName: command.assetName,
      assetPhoto: command.assetPhoto,
      assetPhotoName: command.assetPhotoName,
      description: command.description,
      status: 'PendingReview',
      employeeName: user.name,
      createdByUserId: user.id,
      createdAt: new Date(),
      history: [
        {
          label: 'Employee submitted request',
          at: new Date(),
        },
      ],
    };

    this.requests.set([request, ...this.requests()]);
    this.addNotification('manager', `New asset request: ${request.assetName}`, request.id);
    return request;
  }

  reviewRequest(
    requestId: number,
    action: 'approve' | 'reject',
    payload: { technicianId?: number; managerNote?: string }
  ): AssetRequest {
    const user = this.currentUser();
    if (!user || user.role !== 'manager') {
      throw new Error('Only managers can review requests.');
    }

    const updated = this.requests().map((req) => {
      if (req.id !== requestId) return req;

      const historyEntry =
        action === 'approve'
          ? `Manager approved and assigned ${this.getTechnicianName(payload.technicianId)}`
          : 'Manager rejected the request';

      const nextStatus: AssetLifecycleStatus = action === 'approve' ? 'InProgress' : 'Rejected';
      const assignedTech =
        action === 'approve' && payload.technicianId
          ? this.users().find((tech) => tech.id === payload.technicianId)
          : undefined;

      const nextRequest: AssetRequest = {
        ...req,
        status: nextStatus,
        managerNote: payload.managerNote,
        technicianId: assignedTech?.id,
        technicianName: assignedTech?.name,
        history: [...req.history, { label: historyEntry, at: new Date() }],
      };

      if (action === 'approve' && assignedTech) {
        this.addNotification('technician', `${assignedTech.name}, you were assigned to ${req.assetName}.`, req.id);
        this.addNotification('employee', `${req.assetName} approved. Technician ${assignedTech.name} will handle it.`, req.id);
      } else if (action === 'reject') {
        this.addNotification('employee', `${req.assetName} was rejected.`, req.id);
      }

      return nextRequest;
    });

    this.requests.set(updated);
    return this.requests().find((x) => x.id === requestId)!;
  }

  completeRequest(
    requestId: number,
    payload: { technicianPhoto?: string; technicianPhotoName?: string; technicianNote?: string }
  ): AssetRequest {
    const user = this.currentUser();
    if (!user || user.role !== 'technician') {
      throw new Error('Only technicians can complete requests.');
    }

    const updated = this.requests().map((req) => {
      if (req.id !== requestId) return req;

      const nextRequest: AssetRequest = {
        ...req,
        status: 'Completed',
        technicianNote: payload.technicianNote,
        technicianPhoto: payload.technicianPhoto,
        technicianPhotoName: payload.technicianPhotoName,
        completedAt: new Date(),
        history: [...req.history, { label: 'Technician completed work', at: new Date() }],
      };

      this.addNotification('manager', `${req.assetName} was completed by ${user.name}.`, req.id);
      this.addNotification('employee', `${req.assetName} is now fixed.`, req.id);

      return nextRequest;
    });

    this.requests.set(updated);
    return this.requests().find((x) => x.id === requestId)!;
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

  private getTechnicianName(technicianId?: number): string {
    return technicianId
      ? this.users().find((x) => x.id === technicianId)?.name ?? 'technician'
      : 'technician';
  }
}

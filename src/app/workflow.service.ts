import { Injectable, signal } from '@angular/core';
import { AssetRequest, AssetLifecycleStatus, UserAccount, UserRole, WorkflowNotification } from './models';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private readonly technicians: UserAccount[] = [
    {
      id: 401,
      name: 'Ali - HVAC',
      phoneNumber: '+966500000001',
      role: 'technician',
      permissions: ['requests:complete', 'notifications:view'],
    },
    {
      id: 402,
      name: 'Sara - Electrical',
      phoneNumber: '+966500000002',
      role: 'technician',
      permissions: ['requests:complete', 'notifications:view'],
    },
  ];

  private readonly seedRequests: AssetRequest[] = [
    {
      id: 1,
      assetName: 'Office AC Unit',
      assetPhoto: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=60',
      description: 'The main meeting room AC is blowing warm air.',
      status: 'PendingReview',
      employeeName: 'Yousef',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
      history: [
        { label: 'Employee submitted request', at: new Date(Date.now() - 1000 * 60 * 60 * 12) },
      ],
    },
    {
      id: 2,
      assetName: '3D Printer',
      assetPhoto: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=60',
      description: 'The printer nozzle is clogged and needs maintenance.',
      status: 'InProgress',
      employeeName: 'Laila',
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

  private notificationId = 3;
  private requestId = this.seedRequests.length;

  currentUser = signal<UserAccount | null>(null);
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

  login(phoneNumber: string, password: string, role: UserRole): UserAccount {
    const baseUser: Record<UserRole, UserAccount> = {
      employee: {
        id: 201,
        name: 'Employee Demo',
        phoneNumber,
        role: 'employee',
        permissions: ['requests:create', 'notifications:view'],
      },
      manager: {
        id: 301,
        name: 'Facilities Manager',
        phoneNumber,
        role: 'manager',
        permissions: ['requests:review', 'notifications:view'],
      },
      technician: this.technicians[0],
    };

    const loggedIn = baseUser[role];
    this.currentUser.set(loggedIn);
    this.addNotification(role, `Signed in as ${loggedIn.name}.`, undefined);
    return loggedIn;
  }

  getTechnicians(): UserAccount[] {
    return [...this.technicians];
  }

  createRequest(command: { assetName: string; assetPhoto?: string; description?: string }): AssetRequest {
    const user = this.currentUser();
    if (!user || user.role !== 'employee') {
      throw new Error('Only employees can add requests.');
    }

    this.requestId += 1;
    const request: AssetRequest = {
      id: this.requestId,
      assetName: command.assetName,
      assetPhoto: command.assetPhoto,
      description: command.description,
      status: 'PendingReview',
      employeeName: user.name,
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
          ? this.technicians.find((tech) => tech.id === payload.technicianId)
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

  completeRequest(requestId: number, payload: { technicianPhoto?: string; technicianNote?: string }): AssetRequest {
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
        ? { ...req, status: 'Archived' as const, history: [...req.history, { label: 'Archived by manager', at: new Date() }] }
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
    return technicianId ? this.technicians.find((x) => x.id === technicianId)?.name ?? 'technician' : 'technician';
  }
}

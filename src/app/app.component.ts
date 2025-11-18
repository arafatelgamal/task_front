import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService } from './workflow.service';
import { AssetRequest, UserRole } from './models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'Task';
  loginPayload = signal({ phoneNumber: '+966500000000', password: 'Admin@12345', role: 'employee' as UserRole });
  newRequest = signal({ assetName: '', assetPhoto: '', description: '' });
  reviewNote = signal('');
  reviewTechnician = signal<number | undefined>(undefined);
  technicianNotes = signal<Record<number, { note?: string; photo?: string }>>({});
  errorMessage = signal('');
  successMessage = signal('');

  constructor(private readonly workflow: WorkflowService) {}

  currentUser = computed(() => this.workflow.currentUser());
  allRequests = computed(() => this.workflow.requests());
  managerQueue = computed(() => this.workflow.requests().filter((req) => req.status === 'PendingReview'));
  technicianQueue = computed(() => {
    const user = this.workflow.currentUser();
    return this.workflow
      .requests()
      .filter((req) => req.status === 'InProgress' && (!user || user.role !== 'technician' || req.technicianId === user.id));
  });
  notifications = computed(() => {
    const user = this.workflow.currentUser();
    return user ? this.workflow.notifications().filter((n) => n.audience === user.role) : [];
  });

  technicians = this.workflow.getTechnicians();

  updateLogin(field: 'phoneNumber' | 'password' | 'role', value: string) {
    this.loginPayload.set({ ...this.loginPayload(), [field]: value as any });
  }

  updateNewRequest(field: 'assetName' | 'assetPhoto' | 'description', value: string) {
    this.newRequest.set({ ...this.newRequest(), [field]: value });
  }

  login() {
    try {
      this.workflow.login(
        this.loginPayload().phoneNumber,
        this.loginPayload().password,
        this.loginPayload().role
      );
      this.successMessage.set(`Logged in as ${this.loginPayload().role}.`);
      this.errorMessage.set('');
    } catch (err: any) {
      this.errorMessage.set(err.message ?? 'Login failed');
    }
  }

  submitRequest() {
    this.successMessage.set('');
    this.errorMessage.set('');
    const payload = this.newRequest();
    if (!payload.assetName) {
      this.errorMessage.set('Asset name is required.');
      return;
    }

    try {
      this.workflow.createRequest(payload);
      this.successMessage.set('Request submitted to manager for review.');
      this.newRequest.set({ assetName: '', assetPhoto: '', description: '' });
    } catch (err: any) {
      this.errorMessage.set(err.message ?? 'Unable to submit request');
    }
  }

  approveRequest(request: AssetRequest) {
    this.successMessage.set('');
    this.errorMessage.set('');
    try {
      this.workflow.reviewRequest(request.id, 'approve', {
        technicianId: this.reviewTechnician(),
        managerNote: this.reviewNote(),
      });
      this.successMessage.set(`${request.assetName} approved and dispatched.`);
      this.reviewNote.set('');
      this.reviewTechnician.set(undefined);
    } catch (err: any) {
      this.errorMessage.set(err.message ?? 'Unable to approve request');
    }
  }

  rejectRequest(request: AssetRequest) {
    this.successMessage.set('');
    this.errorMessage.set('');
    try {
      this.workflow.reviewRequest(request.id, 'reject', { managerNote: this.reviewNote() });
      this.successMessage.set(`${request.assetName} rejected.`);
      this.reviewNote.set('');
    } catch (err: any) {
      this.errorMessage.set(err.message ?? 'Unable to reject request');
    }
  }

  completeRequest(request: AssetRequest) {
    this.successMessage.set('');
    this.errorMessage.set('');
    const payload = this.technicianNotes()[request.id] || {};
    try {
      this.workflow.completeRequest(request.id, {
        technicianNote: payload.note,
        technicianPhoto: payload.photo,
      });
      this.successMessage.set(`${request.assetName} marked as completed.`);
      this.technicianNotes.set({ ...this.technicianNotes(), [request.id]: { note: '', photo: '' } });
    } catch (err: any) {
      this.errorMessage.set(err.message ?? 'Unable to complete request');
    }
  }

  techNoteValue(requestId: number, field: 'note' | 'photo') {
    return this.technicianNotes()[requestId]?.[field] ?? '';
  }

  updateTechNote(requestId: number, field: 'note' | 'photo', value: string) {
    const existing = this.technicianNotes()[requestId] ?? { note: '', photo: '' };
    this.technicianNotes.set({ ...this.technicianNotes(), [requestId]: { ...existing, [field]: value } });
  }

  archive(request: AssetRequest) {
    this.workflow.archiveRejected(request.id);
  }

  statusChip(status: AssetRequest['status']) {
    const map: Record<AssetRequest['status'], string> = {
      Drafted: 'bg-surface text-muted',
      PendingReview: 'bg-warn text-warn-contrast',
      Approved: 'bg-accent text-primary',
      InProgress: 'bg-info text-info-contrast',
      Completed: 'bg-success text-success-contrast',
      Rejected: 'bg-danger text-danger-contrast',
      Archived: 'bg-surface text-muted',
    };
    return map[status];
  }

  getEndpointDescription(role: UserRole) {
    const endpoints: Record<UserRole, string[]> = {
      employee: ['/api/asset-requests (POST)', '/api/asset-requests?OnlyMine=true (GET)'],
      manager: [
        '/api/admin/auth/login',
        '/api/asset-requests?Status=PendingReview (GET)',
        '/api/asset-requests/{id}/review (PUT)',
        '/api/admin/notifications/send (POST)',
      ],
      technician: ['/api/asset-requests?Status=Approved (GET)', '/api/asset-requests/{id}/complete (PUT)'],
    };
    return endpoints[role];
  }
}

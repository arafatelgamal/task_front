import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AssetRequest, UserRole } from './models';
import { WorkflowService } from './workflow.service';

type AppView = 'dashboard' | 'requests' | 'users' | 'notifications';

type TechnicianNoteState = Partial<Record<number, { note?: string; photo?: string; photoName?: string }>>;

type RequestFilters = { status: AssetRequest['status'] | 'all'; onlyMine: boolean };

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'Task';

  loginForm = signal({ phoneNumber: '+966500000100', password: 'Manager@12345' });
  newRequest = signal<{ assetName: string; assetPhoto?: string; assetPhotoName?: string; description?: string }>(
    { assetName: '', assetPhoto: '', assetPhotoName: '', description: '' }
  );
  requestFilters = signal<RequestFilters>({ status: 'all', onlyMine: true });
  reviewNote = signal('');
  reviewTechnician = signal<number | undefined>(undefined);
  technicianNotes = signal<TechnicianNoteState>({});
  userForm = signal({
    name: '',
    phoneNumber: '',
    email: '',
    role: 'employee' as UserRole,
    password: 'Temp@12345',
    status: 'Active' as const,
  });
  activeView = signal<AppView>('dashboard');
  errorMessage = signal('');
  successMessage = signal('');

  constructor(private readonly workflow: WorkflowService) {}

  currentUser = computed(() => this.workflow.currentUser());

  technicians = computed(() => this.workflow.getTechnicians());

  allRequests = computed(() => this.workflow.requests());

  users = computed(() => this.workflow.listUsers());

  visibleRequests = computed(() => {
    const user = this.workflow.currentUser();
    const { status, onlyMine } = this.requestFilters();

    return this.workflow
      .requests()
      .filter((req) => (status === 'all' ? true : req.status === status))
      .filter((req) => {
        if (!user) return false;
        if (user.role === 'manager') return true;
        if (user.role === 'employee') return onlyMine ? req.createdByUserId === user.id : true;
        if (user.role === 'technician') return req.technicianId ? req.technicianId === user.id : !onlyMine;
        return true;
      });
  });

  myNotifications = computed(() => {
    const user = this.workflow.currentUser();
    return user ? this.workflow.notifications().filter((n) => n.audience === user.role) : [];
  });

  dashboardStats = computed(() => {
    const requests = this.workflow.requests();
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === 'PendingReview').length,
      inProgress: requests.filter((r) => r.status === 'InProgress').length,
      completed: requests.filter((r) => r.status === 'Completed').length,
    };
  });

  login() {
    this.errorMessage.set('');
    try {
      const user = this.workflow.login(this.loginForm().phoneNumber, this.loginForm().password);
      this.successMessage.set(`Welcome ${user.name}. Redirecting to your dashboard.`);
      this.activeView.set('dashboard');
    } catch (err: any) {
      this.errorMessage.set(err.message ?? 'Login failed');
    }
  }

  logout() {
    this.workflow.logout();
    this.activeView.set('dashboard');
  }

  switchView(view: AppView) {
    this.activeView.set(view);
    this.successMessage.set('');
  }

  updateLogin(field: 'phoneNumber' | 'password', value: string) {
    this.loginForm.set({ ...this.loginForm(), [field]: value });
  }

  updateNewRequest(field: 'assetName' | 'description', value: string) {
    this.newRequest.set({ ...this.newRequest(), [field]: value });
  }

  updateRequestFilter(field: keyof RequestFilters, value: any) {
    this.requestFilters.set({ ...this.requestFilters(), [field]: value });
  }

  updateUserForm(field: keyof ReturnType<typeof this.userForm>, value: any) {
    this.userForm.set({ ...this.userForm(), [field]: value });
  }

  handleAssetFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      this.newRequest.set({ ...this.newRequest(), assetPhoto: '', assetPhotoName: '' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.newRequest.set({
        ...this.newRequest(),
        assetPhoto: reader.result as string,
        assetPhotoName: file.name,
      });
    };
    reader.readAsDataURL(file);
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
      this.newRequest.set({ assetName: '', assetPhoto: '', assetPhotoName: '', description: '' });
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

  updateTechNote(requestId: number, field: 'note', value: string) {
    const current = this.technicianNotes()[requestId] ?? { note: '', photo: '', photoName: '' };
    this.technicianNotes.set({ ...this.technicianNotes(), [requestId]: { ...current, note: value } });
  }

  handleTechFile(requestId: number, event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    const current = this.technicianNotes()[requestId] ?? { note: '', photo: '', photoName: '' };

    if (!file) {
      this.technicianNotes.set({ ...this.technicianNotes(), [requestId]: { ...current, photo: '', photoName: '' } });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.technicianNotes.set({
        ...this.technicianNotes(),
        [requestId]: { ...current, photo: reader.result as string, photoName: file.name },
      });
    };
    reader.readAsDataURL(file);
  }

  completeRequest(request: AssetRequest) {
    this.successMessage.set('');
    this.errorMessage.set('');
    const payload = this.technicianNotes()[request.id] || {};
    try {
      this.workflow.completeRequest(request.id, {
        technicianNote: payload.note,
        technicianPhoto: payload.photo,
        technicianPhotoName: payload.photoName,
      });
      this.successMessage.set(`${request.assetName} marked as completed.`);
      this.technicianNotes.set({ ...this.technicianNotes(), [request.id]: { note: '', photo: '', photoName: '' } });
    } catch (err: any) {
      this.errorMessage.set(err.message ?? 'Unable to complete request');
    }
  }

  archive(request: AssetRequest) {
    this.workflow.archiveRejected(request.id);
  }

  createUser() {
    this.successMessage.set('');
    this.errorMessage.set('');
    const payload = this.userForm();
    if (!payload.name || !payload.phoneNumber) {
      this.errorMessage.set('Name and phone number are required.');
      return;
    }

    try {
      this.workflow.addUser({
        ...payload,
        permissions: [],
      } as any);
      this.successMessage.set(`${payload.name} created successfully.`);
      this.userForm.set({ name: '', phoneNumber: '', email: '', role: 'employee', password: 'Temp@12345', status: 'Active' });
    } catch (err: any) {
      this.errorMessage.set(err.message ?? 'Unable to create user');
    }
  }

  statusChip(status: AssetRequest['status']) {
    const map: Record<AssetRequest['status'], string> = {
      Drafted: 'chip muted',
      PendingReview: 'chip warn',
      Approved: 'chip accent',
      InProgress: 'chip info',
      Completed: 'chip success',
      Rejected: 'chip danger',
      Archived: 'chip muted',
    };
    return map[status];
  }

  userBadge(role: UserRole) {
    const map: Record<UserRole, string> = {
      employee: 'badge',
      manager: 'badge badge-dark',
      technician: 'badge badge-info',
    };
    return map[role];
  }

  endpointLabel(role: UserRole) {
    const endpoints: Record<UserRole, string[]> = {
      employee: ['/api/admin/auth/login', '/api/asset-requests (POST)', '/api/asset-requests?OnlyMine=true (GET)'],
      manager: [
        '/api/admin/auth/login',
        '/api/asset-requests?Status=PendingReview (GET)',
        '/api/asset-requests/{id}/review (PUT)',
        '/api/admin/notifications/send (POST)',
        '/api/admin/users/paginated (GET)',
      ],
      technician: ['/api/admin/auth/login', '/api/asset-requests?Status=Approved (GET)', '/api/asset-requests/{id}/complete (PUT)'],
    };
    return endpoints[role];
  }
}

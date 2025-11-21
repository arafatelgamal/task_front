import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AssetRequest, UserRole } from './models';
import { LoginScreenComponent } from './login/login-screen.component';
import { WorkflowService } from './workflow.service';
import { LoginAdminResponse, LoginCredentials } from './login/auth.models';
import { SidebarComponent } from './sidebar/sidebar.component';
import { UserManagementComponent } from './users/user-management.component';
import { AuthService } from './services/auth.service';
import { RequestBoardComponent } from './requests/request-board.component';
import { RequestCreatePageComponent } from './requests/request-create-page.component';
import { ThemeService, ThemeOptionId } from './services/theme.service';

type AppView = 'dashboard' | 'requests' | 'create-request' | 'users' | 'notifications';

@Component({
  selector: 'app-root',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    LoginScreenComponent,
    SidebarComponent,
    UserManagementComponent,
    RequestBoardComponent,
    RequestCreatePageComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'Task';

  loginForm = signal<LoginCredentials>({ countryCode: '+966', phoneNumber: '', password: '' });
  activeView = signal<AppView>('dashboard');
  errorMessage = signal('');
  successMessage = signal('');
  mobileNavOpen = signal(false);

  constructor(
    private readonly workflow: WorkflowService,
    private readonly auth: AuthService,
    readonly themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    const existingUser = this.auth.restoreSession();
    if (existingUser) {
      this.workflow.setAuthenticatedAdmin(existingUser);
      this.activeView.set('dashboard');
      this.refreshRequestsForUser();
    }
  }

  currentUser = computed(() => this.workflow.currentUser());

  technicians = computed(() => this.workflow.getTechnicians());

  recentRequests = computed(() => this.workflow.requests());

  myNotifications = computed(() => {
    const user = this.workflow.currentUser();
    return user ? this.workflow.notifications().filter((n) => n.audience === user.rolesNames) : [];
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

  themes = this.themeService.themes;
  currentTheme = this.themeService.currentTheme;

  logout() {
    this.auth.logout();
    this.workflow.logout();
    this.activeView.set('dashboard');
    this.mobileNavOpen.set(false);
  }

  handleAuthenticated(response: LoginAdminResponse) {
    this.errorMessage.set('');
    const user = this.workflow.setAuthenticatedAdmin(response.user);
    this.successMessage.set(`Welcome ${user.fullName}. Redirecting to your dashboard.`);
    this.activeView.set('dashboard');
    this.mobileNavOpen.set(false);
    this.refreshRequestsForUser();
  }

  switchView(view: AppView) {
    const user = this.workflow.currentUser();
    if (view === 'users' && user?.rolesNames !== 'manager') {
      this.activeView.set('dashboard');
      return;
    }

    if (view === 'create-request' && user?.rolesNames !== 'employee') {
      this.activeView.set('requests');
      return;
    }

    this.activeView.set(view);
    this.successMessage.set('');
    this.mobileNavOpen.set(false);
  }

  handleCredentialsChange(credentials: LoginCredentials) {
    this.loginForm.set(credentials);
  }

  handleSuccess(message: string) {
    this.successMessage.set(message);
    this.errorMessage.set('');
  }

  handleError(message: string) {
    if (!message) return;
    this.errorMessage.set(message);
    this.successMessage.set('');
  }

  handleNewRequest() {
    this.activeView.set('create-request');
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  handleRequestCreated(message: string) {
    this.handleSuccess(message);
    this.refreshRequestsForUser();
    this.activeView.set('requests');
  }

  setTheme(theme: ThemeOptionId) {
    this.themeService.setTheme(theme);
  }

  private refreshRequestsForUser() {
    const user = this.workflow.currentUser();
    if (!user) return;

    const onlyMine = user.rolesNames !== 'manager';
    this.workflow.loadRequests({ onlyMine }).subscribe({
      error: (err) => this.handleError(err?.message ?? 'Unable to load requests'),
    });
  }

  openMobileNav() {
    this.mobileNavOpen.set(true);
  }

  closeMobileNav() {
    this.mobileNavOpen.set(false);
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

}

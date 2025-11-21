import { Injectable, signal } from '@angular/core';
import { delay, of, throwError } from 'rxjs';
import { LoginAdminResponse, LoginCredentials, AdminUserDto } from '../login/auth.models';
import { WorkflowService } from '../workflow.service';
import { UserAccount } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly adminUser = signal<AdminUserDto | null>(null);

  constructor(private readonly workflow: WorkflowService) {}

  login(credentials: LoginCredentials) {
    const phoneWithCountry = `${(credentials.countryCode || '').trim()}${(credentials.phoneNumber || '').trim()}`;

    try {
      const user = this.workflow.login(phoneWithCountry, credentials.password);
      const response = this.buildAdminResponse(user);
      this.persistSession(response);
      return of(response).pipe(delay(250));
    } catch (err: any) {
      return throwError(() => new Error(err?.message || 'Unable to sign in.'));
    }
  }

  logout() {
    this.adminUser.set(null);
    localStorage.removeItem('task-token');
    localStorage.removeItem('task-refresh');
    localStorage.removeItem('task-user');
  }

  private persistSession(payload: LoginAdminResponse) {
    this.adminUser.set(payload.user);
    localStorage.setItem('task-token', payload.token);
    localStorage.setItem('task-refresh', payload.refreshToken);
    localStorage.setItem('task-user', JSON.stringify(payload.user));
  }

  restoreSession(): AdminUserDto | null {
    const token = localStorage.getItem('task-token');
    const user = localStorage.getItem('task-user');

    if (!token || !user) {
      return null;
    }

    try {
      const parsedUser = JSON.parse(user) as AdminUserDto;
      this.adminUser.set(parsedUser);
      return parsedUser;
    } catch (err) {
      this.logout();
      return null;
    }
  }

  private buildAdminResponse(user: UserAccount): LoginAdminResponse {
    const adminUser: AdminUserDto = {
      id: user.id,
      email: user.email || `${user.name.replace(/\s+/g, '.').toLowerCase()}@example.com`,
      fullName: user.name,
      phoneNumber: user.phoneNumber,
      role: user.role,
      permissions: user.permissions,
      joinedDate: user.createdAt.toISOString(),
      isActive: user.status === 'Active',
    };

    return {
      token: 'demo-token',
      refreshToken: 'demo-refresh',
      user: adminUser,
    };
  }
}

import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../shared/api-response';
import { AdminUserDto, LoginAdminResponse, LoginCredentials } from '../login/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}/api/admin/auth`;
  readonly adminUser = signal<AdminUserDto | null>(null);

  constructor(private readonly http: HttpClient) {}

  login(credentials: LoginCredentials) {
    const phoneWithCountry = `${(credentials.countryCode || '').trim()}${(credentials.phoneNumber || '').trim()}`;

    return this.http
      .post<ApiResponse<LoginAdminResponse> | LoginAdminResponse>(`${this.baseUrl}/login`, {
        phoneNumber: phoneWithCountry,
        password: credentials.password,
      })
      .pipe(tap((response) => this.persistSession(this.unwrap(response))));
  }

  logout() {
    this.adminUser.set(null);
    localStorage.removeItem('task-token');
    localStorage.removeItem('task-refresh');
  }

  private persistSession(payload: LoginAdminResponse) {
    this.adminUser.set(payload.user);
    localStorage.setItem('task-token', payload.token);
    localStorage.setItem('task-refresh', payload.refreshToken);
  }

  private unwrap<T>(response: ApiResponse<T> | T): T {
    return (response as ApiResponse<T>).data ?? (response as T);
  }
}

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

var baseUrl = 'https://localhost:5550';

export interface LoginCredentials {
  phoneNumber: string;
  password: string;
}

export interface AdminUserDto {
  id: number;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  nationalId?: string;
  role: string;
  permissions: string[];
  joinedDate: string;
  isActive: boolean;
}

export interface LoginAdminResponse {
  token: string;
  refreshToken: string;
  user: AdminUserDto;
}

type ApiResponse<T> = { data?: T; succeeded?: boolean; message?: string } & Partial<T>;

@Component({
  selector: 'app-login-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-screen.component.html',
  styleUrl: './login-screen.component.css',
})
export class LoginScreenComponent {
  @Input({ required: true }) credentials!: LoginCredentials;
  @Input() error = '';
  @Input() success = '';

  @Output() credentialsChange = new EventEmitter<LoginCredentials>();
  @Output() authenticated = new EventEmitter<LoginAdminResponse>();
  @Output() forgotPassword = new EventEmitter<void>();

  loading = false;

  constructor(private readonly http: HttpClient) {}

  updateField(field: keyof LoginCredentials, value: string) {
    this.credentialsChange.emit({ ...this.credentials, [field]: value });
  }

  submit() {
    this.error = '';
    this.success = '';
    this.loading = true;

    this.http
      .post<ApiResponse<LoginAdminResponse>>(baseUrl+'/api/admin/auth/login', {
        phoneNumber: this.credentials.phoneNumber,
        password: this.credentials.password,
      })
      .subscribe({
        next: (response) => {
          const payload = (response as ApiResponse<LoginAdminResponse>).data ?? (response as LoginAdminResponse);
          if (!payload || !payload.user) {
            this.error = response.message || 'Unexpected response from server.';
            this.loading = false;
            return;
          }

          this.success = `Welcome ${payload.user.fullName || payload.user.email || 'Admin'}.`;
          this.authenticated.emit(payload as LoginAdminResponse);
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.message || 'Unable to sign in. Please check your credentials.';
          this.loading = false;
        },
      });
  }
}

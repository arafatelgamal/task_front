import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../shared/api-response';
import { LoginAdminResponse, LoginCredentials } from './auth.models';

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

  loading = false;

  constructor(private readonly auth: AuthService) {}

  updateField(field: keyof LoginCredentials, value: string) {
    this.credentialsChange.emit({ ...this.credentials, [field]: value });
  }

  submit() {
    this.error = '';
    this.success = '';
    this.loading = true;

    this.auth.login(this.credentials).subscribe({
      next: (response) => {
        const payload = (response as ApiResponse<LoginAdminResponse>).data ?? (response as LoginAdminResponse);
        if (!payload || !payload.user) {
          this.error = (response as ApiResponse<LoginAdminResponse>).message || 'Unexpected response from server.';
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

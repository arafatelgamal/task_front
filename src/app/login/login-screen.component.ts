import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
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
        if (!response?.user) {
          this.error = 'Unexpected response from local auth flow.';
          this.loading = false;
          return;
        }

        this.success = `Welcome ${response.user.fullName || response.user.email || 'Admin'}.`;
        this.authenticated.emit(response as LoginAdminResponse);
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message || 'Unable to sign in. Please check your credentials.';
        this.loading = false;
      },
    });
  }
}

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface LoginCredentials {
  phoneNumber: string;
  password: string;
}

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
  @Output() login = new EventEmitter<LoginCredentials>();
  @Output() forgotPassword = new EventEmitter<void>();

  quickFill(credentials: LoginCredentials) {
    this.credentialsChange.emit(credentials);
  }

  updateField(field: keyof LoginCredentials, value: string) {
    this.credentialsChange.emit({ ...this.credentials, [field]: value });
  }

  submit() {
    this.login.emit(this.credentials);
  }
}

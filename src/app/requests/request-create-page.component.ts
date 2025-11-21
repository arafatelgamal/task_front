import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { RequestFormComponent } from './request-form.component';

@Component({
  selector: 'app-request-create-page',
  standalone: true,
  imports: [CommonModule, RequestFormComponent],
  templateUrl: './request-create-page.component.html',
  styleUrl: './request-create-page.component.css',
})
export class RequestCreatePageComponent {
  @Output() submitted = new EventEmitter<string>();
  @Output() error = new EventEmitter<string>();
  @Output() back = new EventEmitter<void>();

  handleSubmitted(message: string) {
    this.submitted.emit(message);
  }
}

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkflowService } from '../workflow.service';

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './request-form.component.html',
  styleUrl: './request-form.component.css',
})
export class RequestFormComponent {
  @Output() submitted = new EventEmitter<string>();
  @Output() error = new EventEmitter<string>();

  assetName = signal('');
  description = signal('');
  assetPhotoName = signal('');
  private assetPhotoFile: File | null = null;
  isSubmitting = signal(false);

  constructor(private readonly workflow: WorkflowService) {}

  handleAssetFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.assetPhotoFile = file ?? null;
    this.assetPhotoName.set(file?.name ?? '');
  }

  submitRequest() {
    this.error.emit('');
    if (!this.assetName().trim()) {
      this.error.emit('Asset name is required.');
      return;
    }

    this.isSubmitting.set(true);
    this.workflow
      .createRequest({
        assetName: this.assetName(),
        assetPhoto: this.assetPhotoFile ?? undefined,
        description: this.description(),
      })
      .subscribe({
        next: () => {
          this.submitted.emit('Request submitted to manager for review.');
          this.assetName.set('');
          this.description.set('');
          this.assetPhotoName.set('');
          this.assetPhotoFile = null;
          this.isSubmitting.set(false);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.error.emit(err?.message ?? 'Unable to submit request');
        },
      });
  }
}

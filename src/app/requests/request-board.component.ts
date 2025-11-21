import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AssetRequest, UserAccount } from '../models';
import { ApiAssetRequestStatus } from './asset-request.models';
import { WorkflowService } from '../workflow.service';

interface TechnicianNoteState {
  [requestId: number]: { note?: string; photo?: string; photoName?: string };
}

@Component({
  selector: 'app-request-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './request-board.component.html',
  styleUrl: './request-board.component.css',
})
export class RequestBoardComponent implements OnInit, OnChanges {
  @Input() user!: UserAccount;
  @Input() technicians: UserAccount[] = [];
  @Output() success = new EventEmitter<string>();
  @Output() error = new EventEmitter<string>();

  filters = signal<{ status: ApiAssetRequestStatus | 'all'; onlyMine: boolean }>({
    status: 'all',
    onlyMine: true,
  });
  reviewNote = signal('');
  reviewTechnician = signal<number | undefined>(undefined);
  technicianNotes = signal<TechnicianNoteState>({});
  isLoading = signal(false);

  requests = computed(() => this.workflow.requests());

  constructor(private readonly workflow: WorkflowService) {}

  ngOnInit(): void {
    this.refresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user) {
      const onlyMineDefault = this.user.role !== 'manager';
      this.filters.update((current) => ({ ...current, onlyMine: onlyMineDefault }));
      this.refresh();
    }
  }

  refresh() {
    this.isLoading.set(true);
    this.workflow
      .loadRequests({
        onlyMine: this.filters().onlyMine,
        status: this.filters().status === 'all' ? undefined : this.filters().status,
      })
      .subscribe({
        next: () => this.isLoading.set(false),
        error: (err) => {
          this.isLoading.set(false);
          this.error.emit(err?.message ?? 'Unable to load requests');
        },
      });
  }

  updateRequestFilter(field: 'status' | 'onlyMine', value: any) {
    this.filters.set({ ...this.filters(), [field]: value });
    this.refresh();
  }

  approveRequest(request: AssetRequest) {
    this.reviewOrReject(request, true, 'approved and dispatched.');
  }

  rejectRequest(request: AssetRequest) {
    this.reviewOrReject(request, false, 'rejected.');
  }

  private reviewOrReject(request: AssetRequest, approve: boolean, successSuffix: string) {
    this.workflow
      .reviewRequest(request.id, {
        approve,
        technicianId: approve ? this.reviewTechnician() : undefined,
        managerNote: this.reviewNote(),
      })
      .subscribe({
        next: () => {
          this.success.emit(`${request.assetName} ${successSuffix}`);
          this.reviewNote.set('');
          this.reviewTechnician.set(undefined);
        },
        error: (err) => this.error.emit(err?.message ?? 'Unable to review request'),
      });
  }

  updateTechNote(requestId: number, value: string) {
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
    const payload = this.technicianNotes()[request.id] || {};
    this.workflow
      .completeRequest(request.id, {
        technicianNote: payload.note,
        technicianPhoto: payload.photo ?? '',
      })
      .subscribe({
        next: () => {
          this.success.emit(`${request.assetName} marked as completed.`);
          this.technicianNotes.set({ ...this.technicianNotes(), [request.id]: { note: '', photo: '', photoName: '' } });
        },
        error: (err) => this.error.emit(err?.message ?? 'Unable to complete request'),
      });
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

  statusLabel(status: ApiAssetRequestStatus | 'all') {
    if (status === 'all') return 'All';
    const map: Record<ApiAssetRequestStatus, string> = {
      [ApiAssetRequestStatus.PendingManagerReview]: 'Pending review',
      [ApiAssetRequestStatus.SentToTechnician]: 'In progress',
      [ApiAssetRequestStatus.Completed]: 'Completed',
      [ApiAssetRequestStatus.Archived]: 'Archived',
    };
    return map[status];
  }

  canReview(user: UserAccount, request: AssetRequest) {
    return user.role === 'manager' && request.status === 'PendingReview';
  }

  canComplete(user: UserAccount, request: AssetRequest) {
    return user.role === 'technician' && request.status === 'InProgress';
  }
}

import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import {
  ApiAssetRequestStatus,
  AssetRequestDto,
  AssetRequestListResponse,
  CompleteAssetRequestCommand,
  CreateAssetRequestCommand,
  CreateAssetRequestResultDto,
  GetAssetRequestsQuery,
  ReviewAssetRequestCommand,
} from '../requests/asset-request.models';

@Injectable({ providedIn: 'root' })
export class AssetRequestsService {
  private requestId = 5;
  private readonly requests: AssetRequestDto[] = [
    {
      id: 1,
      assetName: 'Office AC Unit',
      assetPhoto: '',
      description: 'Repair fourth floor AC drip',
      status: ApiAssetRequestStatus.PendingManagerReview,
      employeeId: 201,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    },
    {
      id: 2,
      assetName: '3D Printer Calibration',
      assetPhoto: '',
      description: 'Lab printer alignment and cleaning',
      status: ApiAssetRequestStatus.SentToTechnician,
      employeeId: 201,
      technicianId: 401,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 62).toISOString(),
      managerDecisionAt: new Date(Date.now() - 1000 * 60 * 60 * 54).toISOString(),
    },
    {
      id: 3,
      assetName: 'Server room UPS',
      assetPhoto: '',
      description: 'Battery replacement needed',
      status: ApiAssetRequestStatus.Completed,
      employeeId: 301,
      technicianId: 402,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
      closedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      technicianNote: 'Replaced battery pack and updated firmware.',
    },
    {
      id: 4,
      assetName: 'Lobby signage',
      assetPhoto: '',
      description: 'Digital signage flickers intermittently',
      status: ApiAssetRequestStatus.Archived,
      employeeId: 301,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 200).toISOString(),
      closedAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    },
  ];

  create(payload: CreateAssetRequestCommand, employeeId = 201): Observable<CreateAssetRequestResultDto> {
    this.requestId += 1;
    const next: AssetRequestDto = {
      id: this.requestId,
      assetName: payload.assetName,
      assetPhoto: '',
      description: payload.description ?? '',
      status: ApiAssetRequestStatus.PendingManagerReview,
      employeeId,
      createdAt: new Date().toISOString(),
    };

    this.requests.unshift(next);
    return of({ id: next.id }).pipe(delay(200));
  }

  getList(query: GetAssetRequestsQuery): Observable<AssetRequestListResponse> {
    let filtered = [...this.requests];
    if (query.status) {
      filtered = filtered.filter((req) => req.status === query.status);
    }

    return of({ requests: filtered }).pipe(delay(180));
  }

  getById(id: number): Observable<AssetRequestDto> {
    const match = this.requests.find((req) => req.id === id);
    if (!match) return throwError(() => new Error('Request not found'));
    return of(match).pipe(delay(160));
  }

  review(id: number, command: ReviewAssetRequestCommand): Observable<boolean> {
    const index = this.requests.findIndex((req) => req.id === id);
    if (index === -1) return throwError(() => new Error('Request not found'));

    this.requests[index] = {
      ...this.requests[index],
      status: command.approve ? ApiAssetRequestStatus.SentToTechnician : ApiAssetRequestStatus.Archived,
      managerDecisionNote: command.managerNote,
      technicianId: command.technicianId,
      managerDecisionAt: new Date().toISOString(),
      closedAt: command.approve ? undefined : new Date().toISOString(),
    };

    return of(true).pipe(delay(220));
  }

  complete(id: number, command: CompleteAssetRequestCommand): Observable<boolean> {
    const index = this.requests.findIndex((req) => req.id === id);
    if (index === -1) return throwError(() => new Error('Request not found'));

    this.requests[index] = {
      ...this.requests[index],
      status: ApiAssetRequestStatus.Completed,
      technicianNote: command.technicianNote,
      technicianPhoto: command.technicianPhoto,
      closedAt: new Date().toISOString(),
    };

    return of(true).pipe(delay(180));
  }
}

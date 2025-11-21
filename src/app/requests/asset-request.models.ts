import { AssetLifecycleStatus, AssetRequest } from '../models';

export enum ApiAssetRequestStatus {
  PendingManagerReview = 1,
  SentToTechnician = 2,
  Completed = 3,
  Archived = 4,
}

export interface CreateAssetRequestCommand {
  assetName: string;
  assetPhoto?: File;
  description?: string;
}

export interface CreateAssetRequestResultDto {
  id: number;
}

export interface GetAssetRequestsQuery {
  pageNumber?: number;
  pageSize?: number;
  status?: ApiAssetRequestStatus;
  onlyMine?: boolean;
}

export interface AssetRequestDto {
  id: number;
  assetName: string;
  assetPhoto: string;
  description: string;
  status: ApiAssetRequestStatus;
  employeeId: number;
  managerId?: number;
  technicianId?: number;
  managerDecisionNote?: string;
  createdAt: string;
  managerDecisionAt?: string;
  technicianNote?: string;
  technicianPhoto?: string;
  closedAt?: string;
}

export interface AssetRequestListResponse {
  requests: AssetRequestDto[];
}

export interface ReviewAssetRequestCommand {
  approve: boolean;
  technicianId?: number;
  managerNote?: string;
}

export interface CompleteAssetRequestCommand {
  technicianPhoto: string;
  technicianNote?: string;
}

export const statusMap: Record<ApiAssetRequestStatus, AssetLifecycleStatus> = {
  [ApiAssetRequestStatus.PendingManagerReview]: 'PendingReview',
  [ApiAssetRequestStatus.SentToTechnician]: 'InProgress',
  [ApiAssetRequestStatus.Completed]: 'Completed',
  [ApiAssetRequestStatus.Archived]: 'Archived',
};

export function mapToAssetRequest(dto: AssetRequestDto): AssetRequest {
  return {
    id: dto.id,
    assetName: dto.assetName,
    assetPhoto: dto.assetPhoto,
    description: dto.description,
    status: statusMap[dto.status] ?? 'Drafted',
    employeeName: `Employee #${dto.employeeId}`,
    createdByUserId: dto.employeeId,
    technicianId: dto.technicianId,
    managerNote: dto.managerDecisionNote,
    technicianNote: dto.technicianNote,
    technicianPhoto: dto.technicianPhoto,
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    completedAt: dto.closedAt ? new Date(dto.closedAt) : undefined,
    history: [],
  };
}

export type UserRole = 'employee' | 'manager' | 'technician';


export interface UserAccount {
  id: number;
  fullName: string;
  phoneNumber: string;
  email?: string;
  rolesNames: UserRole;
  permissions: string[];
  isActive: boolean;
  password: string;
  createdAt: Date;
}

export type AssetLifecycleStatus =
  | 'Drafted'
  | 'PendingReview'
  | 'Approved'
  | 'InProgress'
  | 'Completed'
  | 'Rejected'
  | 'Archived';

export interface AssetRequest {
  id: number;
  assetName: string;
  assetPhoto?: string;
  assetPhotoName?: string;
  description?: string;
  status: AssetLifecycleStatus;
  employeeName: string;
  createdByUserId?: number;
  technicianId?: number;
  technicianName?: string;
  managerNote?: string;
  technicianNote?: string;
  technicianPhoto?: string;
  technicianPhotoName?: string;
  createdAt: Date;
  completedAt?: Date;
  history: { label: string; at: Date }[];
}

export interface WorkflowNotification {
  id: number;
  audience: UserRole;
  message: string;
  createdAt: Date;
  relatedRequestId?: number;
}

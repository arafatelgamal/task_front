export type UserRole = 'employee' | 'manager' | 'technician';

export type UserStatus = 'Active' | 'Suspended';

export interface UserAccount {
  id: number;
  name: string;
  phoneNumber: string;
  email?: string;
  role: UserRole;
  permissions: string[];
  status: UserStatus;
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

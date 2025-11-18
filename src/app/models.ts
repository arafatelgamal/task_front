export type UserRole = 'employee' | 'manager' | 'technician';

export interface UserAccount {
  id: number;
  name: string;
  phoneNumber: string;
  role: UserRole;
  permissions: string[];
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
  description?: string;
  status: AssetLifecycleStatus;
  employeeName: string;
  technicianId?: number;
  technicianName?: string;
  managerNote?: string;
  technicianNote?: string;
  technicianPhoto?: string;
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

export interface GetAdminNotificationsQuery {
  pageNumber?: number;
  pageSize?: number;
  onlyUnread?: boolean;
  typeIds?: number[];
  search?: string;
}

export interface NotificationsResponse {
  items: NotificationDto[];
}

export interface NotificationDto {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  notificationTypeId?: number;
  notificationTypeName?: string;
  typeId?: number;
  createdAt: string;
  relativeTime: string;
}

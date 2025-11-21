import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../shared/api-response';
import { GetAdminNotificationsQuery, NotificationsResponse } from '../notifications/notification-api.models';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly baseUrl = `${environment.apiUrl}/api/admin/notifications`;

  constructor(private readonly http: HttpClient) {}

  getAdminNotifications(query: GetAdminNotificationsQuery): Observable<ApiResponse<NotificationsResponse> | NotificationsResponse> {
    let params = new HttpParams();

    if (query.pageNumber) params = params.set('pageNumber', query.pageNumber);
    if (query.pageSize) params = params.set('pageSize', query.pageSize);
    if (typeof query.onlyUnread === 'boolean') params = params.set('onlyUnread', query.onlyUnread);
    if (query.search) params = params.set('search', query.search);
    if (query.typeIds?.length) query.typeIds.forEach((typeId) => (params = params.append('typeIds', typeId)));

    return this.http.get<ApiResponse<NotificationsResponse> | NotificationsResponse>(`${this.baseUrl}/list`, { params });
  }
}

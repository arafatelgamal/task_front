import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../shared/api-response';
import {
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
  private readonly baseUrl = `${environment.apiUrl}/api/asset-requests`;

  constructor(private readonly http: HttpClient) {}

  create(payload: CreateAssetRequestCommand): Observable<ApiResponse<CreateAssetRequestResultDto>> {
    const formData = new FormData();
    formData.append('AssetName', payload.assetName);
    formData.append('Description', payload.description ?? '');

    if (payload.assetPhoto) {
      formData.append('AssetPhoto', payload.assetPhoto);
    }

    return this.http.post<ApiResponse<CreateAssetRequestResultDto>>(this.baseUrl, formData);
  }

  getList(query: GetAssetRequestsQuery): Observable<ApiResponse<AssetRequestListResponse>> {
    let params = new HttpParams();

    if (query.pageNumber) params = params.set('PageNumber', query.pageNumber);
    if (query.pageSize) params = params.set('PageSize', query.pageSize);
    if (typeof query.status === 'number') params = params.set('Status', query.status);
    if (typeof query.onlyMine === 'boolean') params = params.set('OnlyMine', query.onlyMine);

    return this.http.get<ApiResponse<AssetRequestListResponse>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<ApiResponse<AssetRequestDto>> {
    return this.http.get<ApiResponse<AssetRequestDto>>(`${this.baseUrl}/${id}`);
  }

  review(id: number, command: ReviewAssetRequestCommand): Observable<ApiResponse<boolean | null>> {
    return this.http.put<ApiResponse<boolean | null>>(`${this.baseUrl}/${id}/review`, command);
  }

  complete(
    id: number,
    command: CompleteAssetRequestCommand
  ): Observable<ApiResponse<boolean | null>> {
    return this.http.put<ApiResponse<boolean | null>>(`${this.baseUrl}/${id}/complete`, command);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { ApiResponse } from '../shared/api-response';
import { environment } from '../../environments/environment';
import {
  AddAdminUserCommand,
  AddAdminUserResultDto,
  GetUsersWithPaginationQuery,
  RoleItemDto,
  UpdateUserCommand,
  UserDto,
  UserResponse,
  UserTypeEnum,
} from '../users/user-api.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly baseUrl = `${environment.apiUrl}/api/admin/users`;
  private readonly rolesUrl = `${environment.apiUrl}/api/admin/roles`;

  constructor(private readonly http: HttpClient) {}

  addAdmin(command: AddAdminUserCommand) {
    return this.http
      .post<ApiResponse<AddAdminUserResultDto> | AddAdminUserResultDto>(`${this.baseUrl}/add-admin`, command)
      .pipe(map((response) => this.unwrap(response)));
  }

  getUserById(id: number) {
    return this.http
      .get<ApiResponse<UserDto> | UserDto>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => this.unwrap(response)));
  }

  updateUser(command: UpdateUserCommand) {
    return this.http
      .put<ApiResponse<UserDto> | UserDto>(`${this.baseUrl}/update`, command)
      .pipe(map((response) => this.unwrap(response)));
  }

  deleteUser(id: number) {
    return this.http
      .delete<ApiResponse<string> | string>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => this.unwrap(response)));
  }

  toggleUserStatus(command: { userId: number }) {
    return this.http
      .post<ApiResponse<string> | string>(`${this.baseUrl}/${command.userId}/toggle-status`, {})
      .pipe(map((response) => this.unwrap(response)));
  }

  getUsersList(searchTerm?: string, userType?: UserTypeEnum) {
    let params = new HttpParams();
    if (searchTerm) params = params.set('searchTerm', searchTerm);
    if (userType) params = params.set('userType', userType);

    return this.http
      .get<ApiResponse<UserDto[]> | UserDto[]>(`${this.baseUrl}/list`, { params })
      .pipe(map((response) => this.unwrap(response)));
  }

  getUsersWithPagination(query: GetUsersWithPaginationQuery) {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber)
      .set('pageSize', query.pageSize)
      .set('userType', query.userType);

    if (query.searchTerm) {
      params = params.set('searchTerm', query.searchTerm);
    }

    return this.http
      .get<ApiResponse<UserResponse> | UserResponse>(`${this.baseUrl}/paginated`, { params })
      .pipe(map((response) => this.unwrap(response)));
  }

  getActiveInternalRoles() {
    return this.http
      .get<ApiResponse<RoleItemDto[]> | RoleItemDto[]>(`${this.rolesUrl}/active-internal`)
      .pipe(
        map((response) => {
          const raw = this.unwrap(response as ApiResponse<{ value?: RoleItemDto[] }> | RoleItemDto[] | { value?: RoleItemDto[] });
          const roles = Array.isArray((raw as { value?: RoleItemDto[] })?.value)
            ? (raw as { value?: RoleItemDto[] }).value
            : (raw as RoleItemDto[]);
          return (roles || []).filter((role) => role.label !== 'SuperAdmin');
        }),
      );
  }

  private unwrap<T>(response: ApiResponse<T> | T): T {
    return (response as ApiResponse<T>).data ?? (response as T);
  }
}

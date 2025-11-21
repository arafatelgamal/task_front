export type UserTypeEnum = 'NormalUser' | 'AdminUser' | 'SuperAdmin';

export interface AddAdminUserCommand {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  nationalId: string;
  roles: number[];
}

export interface AddAdminUserResultDto {
  userId: number;
}

export interface UpdateUserCommand {
  id: number;
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  nationalId?: string;
  password?: string;
  roles?: number[];
}

export interface ToggleUserStatusCommand {
  userId: number;
}

export interface GetUsersWithPaginationQuery {
  searchTerm?: string;
  userType: UserTypeEnum;
  pageNumber: number;
  pageSize: number;
}

export interface UserResponse {
  items: UserDto[];
}

export interface UserDto {
  id: number;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  nationalId?: string;
  dateOfBirth?: string;
  genderId?: number;
  rolesNames: string[];
  roles: number[];
  joinedDate: string;
  isActive: boolean;
}

export interface RoleItemDto {
  value: number;
  label: string;
}

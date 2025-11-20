export interface LoginCredentials {
  countryCode: string;
  phoneNumber: string;
  password: string;
}

export interface AdminUserDto {
  id: number;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  nationalId?: string;
  role: string;
  permissions: string[];
  joinedDate: string;
  isActive: boolean;
}

export interface LoginAdminResponse {
  token: string;
  refreshToken: string;
  user: AdminUserDto;
}

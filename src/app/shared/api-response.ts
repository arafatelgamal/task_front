export interface ApiResponse<T> {
  data?: T;
  succeeded?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

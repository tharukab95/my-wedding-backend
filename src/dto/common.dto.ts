export class ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class PaginatedResponse<T> {
  data: T[];
  pagination: PaginationDto;
}

export enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  AD_NOT_FOUND = 'AD_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  MATCH_NOT_FOUND = 'MATCH_NOT_FOUND',
  INTEREST_NOT_FOUND = 'INTEREST_NOT_FOUND',
  NOTIFICATION_NOT_FOUND = 'NOTIFICATION_NOT_FOUND',
  PHASE_NOT_COMPLETED = 'PHASE_NOT_COMPLETED',
  AD_ALREADY_SUBMITTED = 'AD_ALREADY_SUBMITTED',
  INTEREST_ALREADY_EXPRESSED = 'INTEREST_ALREADY_EXPRESSED',
  MATCH_ALREADY_EXISTS = 'MATCH_ALREADY_EXISTS',
  USER_CREATION_FAILED = 'USER_CREATION_FAILED',
}

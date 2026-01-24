// ==================== API Response Types ====================

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ==================== Error Codes ====================

export const ErrorCodes = {
  // Auth errors
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_EMAIL_NOT_VERIFIED: "AUTH_EMAIL_NOT_VERIFIED",
  AUTH_ACCOUNT_LOCKED: "AUTH_ACCOUNT_LOCKED",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_EMAIL_EXISTS: "AUTH_EMAIL_EXISTS",

  // Course errors
  COURSE_LIMIT_EXCEEDED: "COURSE_LIMIT_EXCEEDED",
  COURSE_NOT_FOUND: "COURSE_NOT_FOUND",
  COURSE_NAME_TOO_LONG: "COURSE_NAME_TOO_LONG",

  // File errors
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  FILE_TOO_MANY_PAGES: "FILE_TOO_MANY_PAGES",
  FILE_DUPLICATE_NAME: "FILE_DUPLICATE_NAME",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  FILE_LIMIT_EXCEEDED: "FILE_LIMIT_EXCEEDED",
  FILE_STORAGE_EXCEEDED: "FILE_STORAGE_EXCEEDED",
  FILE_INVALID_TYPE: "FILE_INVALID_TYPE",
  FILE_IS_SCANNED: "FILE_IS_SCANNED",

  // Quota errors
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",

  // AI errors
  AI_SERVICE_TIMEOUT: "AI_SERVICE_TIMEOUT",
  AI_SERVICE_ERROR: "AI_SERVICE_ERROR",

  // General errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ==================== App Error Class ====================

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ==================== Session Types ====================

export interface SessionUser {
  id: string;
  email: string;
}

export interface AdminSession {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
}

// ==================== Re-export Prisma Types ====================

export type {
  User,
  Course,
  File,
  Explanation,
  ImageRegion,
  QA,
  ReadingProgress,
  Quota,
  QuotaLog,
  UserPreference,
  Admin,
  AccessLog,
  AIUsageLog,
  AuditLog,
  VerificationToken,
} from "@prisma/client";

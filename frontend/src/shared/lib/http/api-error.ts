import type { ApiErrorBody, ApiErrorDetail } from '@/shared/types/api';

/** Client-side error codes (not produced by the server). */
export const CLIENT_ERROR_CODES = {
  NETWORK: 'NETWORK_ERROR',
  ABORTED: 'ABORTED',
  UNKNOWN: 'UNKNOWN',
} as const;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[];
  readonly requestId: string | null;

  constructor(params: {
    status: number;
    code: string;
    message?: string;
    details?: ApiErrorDetail[];
    requestId?: string | null;
  }) {
    super(params.message ?? params.code);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details ?? [];
    this.requestId = params.requestId ?? null;
  }

  static fromBody(status: number, body: ApiErrorBody | undefined, fallbackRequestId: string | null) {
    return new ApiError({
      status,
      code: body?.code ?? statusToCode(status),
      message: body?.message,
      details: body?.details,
      requestId: body?.requestId ?? fallbackRequestId,
    });
  }

  is(code: string): boolean {
    return this.code === code;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Fallback mapping when the server didn't send an error envelope. */
export function statusToCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    case 415:
      return 'UNSUPPORTED_MEDIA_TYPE';
    case 429:
      return 'RATE_LIMITED';
    default:
      return status >= 500 ? 'INTERNAL' : CLIENT_ERROR_CODES.UNKNOWN;
  }
}

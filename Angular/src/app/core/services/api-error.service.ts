import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorDto, ApiResponse } from '../models/api.models';

export interface ApiFailure {
  message: string;
  status: number;
  errors: ApiErrorDto[];
}

export function parseApiFailure(error: unknown, fallback = 'Something went wrong.'): ApiFailure {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      message: error instanceof Error ? error.message : fallback,
      status: 0,
      errors: [],
    };
  }

  if (error.status === 0) {
    return {
      message: 'The service could not be reached. Check your connection and try again.',
      status: 0,
      errors: [],
    };
  }

  const body: unknown = error.error;
  if (isApiResponse(body)) {
    const errors = body.errors ?? [];
    return {
      message: errors.map((item) => item.message).filter(Boolean).join(' ') || body.message || fallback,
      status: error.status,
      errors,
    };
  }

  return {
    message: fallback,
    status: error.status,
    errors: [],
  };
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return 'success' in value && 'message' in value;
}

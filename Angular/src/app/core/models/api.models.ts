export interface ApiErrorDto {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors?: ApiErrorDto[] | null;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === null) {
    const message = response.errors?.map((error) => error.message).join(' ') || response.message;
    throw new ApiContractError(message || 'The API response did not contain data.', response.errors ?? []);
  }
  return response.data;
}

export class ApiContractError extends Error {
  constructor(
    message: string,
    readonly validationErrors: ApiErrorDto[],
  ) {
    super(message);
    this.name = 'ApiContractError';
  }
}

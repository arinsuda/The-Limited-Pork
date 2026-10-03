/** Shared API types that mirror docs/api-contract.md §0 and common refs. */

export type ID = string;
/** RFC3339 UTC timestamp */
export type Timestamp = string;
/** Date-only `YYYY-MM-DD` */
export type DateOnly = string;

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  data: T[];
  meta: PageMeta;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: string;
}

export interface ApiErrorDetail {
  field?: string;
  code: string;
  param?: string;
}

export interface ApiErrorBody {
  code: string;
  message?: string;
  details?: ApiErrorDetail[];
  requestId?: string;
}

export interface LocalizedName {
  nameTh: string;
  nameEn: string;
}

export interface LookupRef extends LocalizedName {
  id: ID;
  code: string;
}

export interface UnitRef extends LocalizedName {
  id: ID;
  code: string;
  symbol: string;
}

export interface UserRef {
  id: ID;
  displayName: string;
}

/** Fields shared by all master-data entities. */
export interface MasterBase extends LocalizedName {
  id: ID;
  code: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
}

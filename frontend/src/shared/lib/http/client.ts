import { ApiError } from './api-error';
import { getApiBaseUrl } from '@/shared/config/env';
import i18n from '@/shared/i18n';

let currentAccessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];
let unauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string | null) => void) {
  refreshSubscribers.push(callback);
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  const headers = new Headers(options.headers);

  if (!options.skipAuth && currentAccessToken) {
    headers.set('Authorization', `Bearer ${currentAccessToken}`);
  }

  headers.set('Accept-Language', i18n.language || 'th');

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  // Handle 401 and attempt automatic token refresh
  if (response.status === 401 && !options.skipAuth && !path.includes('/auth/refresh') && !path.includes('/auth/login')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Accept-Language': i18n.language || 'th' },
        });

        if (refreshRes.ok) {
          const resData = await refreshRes.json();
          const newToken = resData.data.accessToken;
          setAccessToken(newToken);
          isRefreshing = false;
          onRefreshed(newToken);
        } else {
          setAccessToken(null);
          isRefreshing = false;
          onRefreshed(null);
          if (unauthorizedHandler) unauthorizedHandler();
          throw await parseErrorResponse(response);
        }
      } catch (err) {
        setAccessToken(null);
        isRefreshing = false;
        onRefreshed(null);
        if (unauthorizedHandler) unauthorizedHandler();
        throw err;
      }
    }

    // Wait for the in-progress refresh
    const retryPromise = new Promise<T>((resolve, reject) => {
      addRefreshSubscriber((token) => {
        if (!token) {
          reject(new ApiError({ status: 401, code: 'UNAUTHENTICATED' }));
          return;
        }
        resolve(request<T>(path, options));
      });
    });

    return retryPromise;
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const json = await response.json();
  // Unwrap standard DataEnvelope { data: ... }
  if (json && typeof json === 'object' && 'data' in json) {
    if ('meta' in json) {
      // Paged response: return { data, meta }
      return json as T;
    }
    return json.data as T;
  }

  return json as T;
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  const reqId = response.headers.get('X-Request-ID');
  try {
    const errorJson = await response.json();
    if (errorJson && errorJson.error) {
      return ApiError.fromBody(response.status, errorJson.error, reqId);
    }
  } catch {
    // Body is not JSON
  }
  return ApiError.fromBody(response.status, undefined, reqId);
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};

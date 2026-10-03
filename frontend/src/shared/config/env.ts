import { z } from 'zod';

const csv = (fallback: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== '' ? v : fallback))
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );

const int = (fallback: number, min = 0) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v.trim() === '' ? fallback : Number(v)))
    .pipe(z.number().int().min(min));

const num = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v.trim() === '' ? fallback : Number(v)))
    .pipe(z.number());

const str = (fallback: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v.trim() === '' ? fallback : v.trim()));

export const envSchema = z
  .object({
    VITE_API_BASE_URL: str('/api/v1').transform((v) => v.replace(/\/+$/, '')),
    VITE_WS_URL: z
      .string()
      .optional()
      .transform((v) => (v && v.trim() !== '' ? v.trim() : null)),
    VITE_DEFAULT_LOCALE: str('th'),
    VITE_SUPPORTED_LOCALES: csv('th,en'),
    VITE_DATE_CALENDAR: str('buddhist').pipe(z.enum(['buddhist', 'gregorian'])),
    VITE_DEFAULT_THEME: str('system').pipe(z.enum(['light', 'dark', 'system'])),
    VITE_QUERY_STALE_TIME_MS: int(30_000),
    VITE_QUERY_RETRY: int(1),
    VITE_DEFAULT_PAGE_SIZE: int(20, 1),
    VITE_SEARCH_DEBOUNCE_MS: int(300),
    VITE_WS_BACKOFF_MIN_MS: int(1_000, 1),
    VITE_WS_BACKOFF_MAX_MS: int(30_000, 1),
    VITE_WS_PING_INTERVAL_MS: int(25_000, 1_000),
    VITE_TOAST_DURATION_MS: int(4_000, 500),
    VITE_UPLOAD_MAX_BYTES: int(10 * 1024 * 1024, 1),
    VITE_UPLOAD_ALLOWED_MIME_TYPES: csv('image/jpeg,image/png,image/webp'),
    VITE_TRIAL_COMPARE_MAX: int(5, 2),
    VITE_PROCESS_TEMP_MIN_C: num(0),
    VITE_PROCESS_TEMP_MAX_C: num(300),
  })
  .refine((e) => e.VITE_SUPPORTED_LOCALES.includes(e.VITE_DEFAULT_LOCALE), {
    message: 'VITE_DEFAULT_LOCALE must be one of VITE_SUPPORTED_LOCALES',
    path: ['VITE_DEFAULT_LOCALE'],
  })
  .refine((e) => e.VITE_WS_BACKOFF_MAX_MS >= e.VITE_WS_BACKOFF_MIN_MS, {
    message: 'VITE_WS_BACKOFF_MAX_MS must be >= VITE_WS_BACKOFF_MIN_MS',
    path: ['VITE_WS_BACKOFF_MAX_MS'],
  });

export type RawEnv = z.input<typeof envSchema>;

export function parseEnv(raw: Record<string, unknown>) {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid frontend environment configuration:\n${issues}`);
  }
  const e = result.data;
  return {
    apiBaseUrl: e.VITE_API_BASE_URL,
    wsUrl: e.VITE_WS_URL,
    defaultLocale: e.VITE_DEFAULT_LOCALE,
    supportedLocales: e.VITE_SUPPORTED_LOCALES,
    dateCalendar: e.VITE_DATE_CALENDAR,
    defaultTheme: e.VITE_DEFAULT_THEME,
    queryStaleTimeMs: e.VITE_QUERY_STALE_TIME_MS,
    queryRetry: e.VITE_QUERY_RETRY,
    defaultPageSize: e.VITE_DEFAULT_PAGE_SIZE,
    searchDebounceMs: e.VITE_SEARCH_DEBOUNCE_MS,
    wsBackoffMinMs: e.VITE_WS_BACKOFF_MIN_MS,
    wsBackoffMaxMs: e.VITE_WS_BACKOFF_MAX_MS,
    wsPingIntervalMs: e.VITE_WS_PING_INTERVAL_MS,
    toastDurationMs: e.VITE_TOAST_DURATION_MS,
    uploadMaxBytes: e.VITE_UPLOAD_MAX_BYTES,
    uploadAllowedMimeTypes: e.VITE_UPLOAD_ALLOWED_MIME_TYPES,
    trialCompareMax: e.VITE_TRIAL_COMPARE_MAX,
    processTempMinC: e.VITE_PROCESS_TEMP_MIN_C,
    processTempMaxC: e.VITE_PROCESS_TEMP_MAX_C,
  } as const;
}

export type AppEnv = ReturnType<typeof parseEnv>;

export const env: AppEnv = parseEnv(import.meta.env as unknown as Record<string, unknown>);

/** Resolve the WebSocket endpoint: explicit VITE_WS_URL, else derived from the API base URL. */
export function resolveWsUrl(
  apiBaseUrl: string,
  wsUrl: string | null,
  location: Pick<Location, 'protocol' | 'host'> = window.location,
): string {
  if (wsUrl) return wsUrl;
  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return `${apiBaseUrl.replace(/^http/i, 'ws')}/ws`;
  }
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  const path = apiBaseUrl.startsWith('/') ? apiBaseUrl : `/${apiBaseUrl}`;
  return `${scheme}://${location.host}${path}/ws`;
}

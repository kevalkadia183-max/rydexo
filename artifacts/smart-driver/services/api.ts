/**
 * Lightweight API client for Rydexo cloud sync.
 *
 * Base URL:
 *   - Web (Expo preview): empty string → relative paths → same-origin, works automatically.
 *   - Native builds: set EXPO_PUBLIC_API_BASE_URL to the full server URL
 *     (e.g. "https://yourapp.replit.app"). Without it, API calls will fail
 *     on native since there is no implicit base URL — set the variable to enable sync.
 */
import { Platform } from 'react-native';

let _token: string | null = null;
let _baseUrl: string = '';

export function setApiToken(token: string | null): void {
  _token = token;
}

export function setApiBaseUrl(url: string): void {
  _baseUrl = url.replace(/\/+$/, '');
}

/**
 * Emit a one-time warning when a native build has no configured base URL.
 * This does not block the request — the fetch will fail naturally, which
 * is handled by the offline-first try/catch in cloudSync.ts.
 */
let _nativeUrlWarned = false;
function warnIfNativeWithoutBaseUrl(): void {
  if (Platform.OS !== 'web' && !_baseUrl && !_nativeUrlWarned) {
    _nativeUrlWarned = true;
    console.warn(
      '[Rydexo] EXPO_PUBLIC_API_BASE_URL is not set. ' +
      'Cloud sync requires a full API server URL for native builds. ' +
      'Set EXPO_PUBLIC_API_BASE_URL to your API server URL to enable sync.'
    );
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  warnIfNativeWithoutBaseUrl();

  const url = `${_baseUrl}${path}`;
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (_token) {
    headers.set('Authorization', `Bearer ${_token}`);
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  register: (email: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => apiFetch<{ user: AuthUser }>('/api/auth/me'),
};

// ─── Sync ─────────────────────────────────────────────────────────────────────

export const syncApi = {
  getTrips: () => apiFetch<{ trips: unknown[] }>('/api/sync/trips'),
  postTrips: (trips: unknown[]) =>
    apiFetch<{ ok: boolean; count: number }>('/api/sync/trips', {
      method: 'POST',
      body: JSON.stringify({ trips }),
    }),
  deleteTrip: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/sync/trips/${id}`, { method: 'DELETE' }),

  getVehicles: () => apiFetch<{ vehicles: unknown[] }>('/api/sync/vehicles'),
  postVehicles: (vehicles: unknown[]) =>
    apiFetch<{ ok: boolean; count: number }>('/api/sync/vehicles', {
      method: 'POST',
      body: JSON.stringify({ vehicles }),
    }),
  deleteVehicle: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/sync/vehicles/${id}`, { method: 'DELETE' }),

  getSettings: () => apiFetch<{ settings: unknown | null }>('/api/sync/settings'),
  putSettings: (settings: unknown) =>
    apiFetch<{ ok: boolean }>('/api/sync/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    }),
};

export const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || '').trim().replace(/\/$/, '') ||
  'https://event-backend-5-v9tx.onrender.com/api/user';

export const APP_BASE =
  typeof window === 'undefined'
    ? 'https://eventpro-frontend-eight.vercel.app'
    : window.location.origin;

export const WS_BASE = API_BASE
  .replace(/\/api(?:\/user)?$/, '')
  .replace(/^http:\/\//, 'ws://')
  .replace(/^https:\/\//, 'wss://');

export const WS_ENABLED = (process.env.NEXT_PUBLIC_ENABLE_WS || '').trim().toLowerCase() === 'true';
export const BACKEND_BASE = API_BASE.replace(/\/api(?:\/user)?$/, '');

// Keep Render backend alive — ping every 4 minutes to prevent spin-down
if (typeof window !== 'undefined') {
  const ping = () => fetch(`${BACKEND_BASE}/health/`).catch(() => {});
  ping();
  setInterval(ping, 4 * 60 * 1000);
}

export function resolveUploadedAssetUrl(
  value?: string | null,
  defaultFolder: 'payment_proofs' | 'damage_reports' | 'profile_photos' = 'payment_proofs'
): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return `${BACKEND_BASE}${trimmed}`;
  if (trimmed.startsWith('media/')) return `${BACKEND_BASE}/${trimmed}`;
  if (
    trimmed.startsWith('payment_proofs/') ||
    trimmed.startsWith('damage_reports/') ||
    trimmed.startsWith('profile_photos/')
  ) {
    return `${BACKEND_BASE}/media/${trimmed}`;
  }

  return `${BACKEND_BASE}/media/${defaultFolder}/${trimmed}`;
}

export async function refreshAccessToken(tokenKey: 'clientToken' | 'organizerToken'): Promise<string | null> {
  const refreshKey = tokenKey === 'clientToken' ? 'clientRefresh' : 'organizerRefresh';
  const refresh = localStorage.getItem(refreshKey);
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_BASE}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem(tokenKey, data.access);
    return data.access;
  } catch { return null; }
}

export async function getValidAccessToken(
  tokenKey: 'clientToken' | 'organizerToken'
): Promise<string | null> {
  const existingToken = localStorage.getItem(tokenKey);
  if (existingToken) {
    return existingToken;
  }
  return refreshAccessToken(tokenKey);
}

export async function apiFetch(
  url: string,
  options: RequestInit = {},
  tokenKey: 'clientToken' | 'organizerToken' = 'clientToken'
): Promise<Response> {
  const token = localStorage.getItem(tokenKey);
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` } as Record<string, string>;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const newToken = await refreshAccessToken(tokenKey);
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { ...options, headers });
    }
  }
  return res;
}

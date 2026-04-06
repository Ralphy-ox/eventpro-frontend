export const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || '').trim().replace(/\/$/, '') ||
  'https://event-backend-5-v9tx.onrender.com/api/user';

export const APP_BASE =
  typeof window === 'undefined'
    ? 'https://event-bookings-git-main-ralphy-777s-projects.vercel.app'
    : window.location.origin;

export const WS_BASE = API_BASE
  .replace(/\/api\/user$/, '')
  .replace(/^http:\/\//, 'ws://')
  .replace(/^https:\/\//, 'wss://');

// Keep Render backend alive — ping every 10 minutes to prevent spin-down
if (typeof window !== 'undefined') {
  const ping = () => fetch(`${API_BASE}/event-types/`).catch(() => {});
  ping();
  setInterval(ping, 10 * 60 * 1000);
}

async function refreshAccessToken(tokenKey: 'clientToken' | 'organizerToken'): Promise<string | null> {
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

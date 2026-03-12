const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export interface TokenPair {
  access: string;
  refresh: string;
}

const tokenStore = {
  getAccess: () => localStorage.getItem('access_token'),
  getRefresh: () => localStorage.getItem('refresh_token'),
  setTokens: (tokens: Partial<TokenPair>) => {
    if (tokens.access) localStorage.setItem('access_token', tokens.access);
    if (tokens.refresh) localStorage.setItem('refresh_token', tokens.refresh);
  },
  clear: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

async function refreshAccessToken(): Promise<void> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) {
    throw new Error('Refresh token topilmadi');
  }

  const response = await fetch(`${API_BASE}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    tokenStore.clear();
    throw new Error('Sessiya muddati tugagan');
  }

  const data = await response.json();
  tokenStore.setTokens({
    access: data.access,
    refresh: data.refresh || refresh,
  });
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = tokenStore.getAccess();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (response.status === 401 && !retried && tokenStore.getRefresh()) {
    await refreshAccessToken();
    return apiRequest<T>(path, init, true);
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    throw payload || { detail: "So'rov muvaffaqiyatsiz tugadi" };
  }

  return payload as T;
}

export async function login(username: string, password: string): Promise<void> {
  const data = await apiRequest<TokenPair>('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  tokenStore.setTokens(data);
}

export function logout(): void {
  tokenStore.clear();
}

export function isAuthenticated(): boolean {
  return Boolean(tokenStore.getAccess());
}

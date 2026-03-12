const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;

const tokenStore = {
  getAccess: () => localStorage.getItem("access_token"),
  getRefresh: () => localStorage.getItem("refresh_token"),
  setTokens: ({ access, refresh }) => {
    if (access) localStorage.setItem("access_token", access);
    if (refresh) localStorage.setItem("refresh_token", refresh);
  },
  clear: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
};

async function refreshToken() {
  const refresh = tokenStore.getRefresh();
  if (!refresh) throw new Error("No refresh token");
  const res = await fetch(`${API_BASE_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    tokenStore.clear();
    throw new Error("Refresh failed");
  }
  const data = await res.json();
  tokenStore.setTokens({ access: data.access, refresh: data.refresh || refresh });
}

export async function apiRequest(path, options = {}, retried = false) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const access = tokenStore.getAccess();
  if (access) headers.Authorization = `Bearer ${access}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (response.status === 401 && !retried && tokenStore.getRefresh()) {
    await refreshToken();
    return apiRequest(path, options, true);
  }
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw data;
  return data;
}

export async function login(username, password) {
  const data = await apiRequest("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  tokenStore.setTokens({ access: data.access, refresh: data.refresh });
  return data;
}

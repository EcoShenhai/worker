import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

const ACCESS_KEY = 'worker_token';
const REFRESH_KEY = 'worker_refresh';
let accessToken = localStorage.getItem(ACCESS_KEY) || null;

export function setToken(token) {
  accessToken = token;
  if (token) localStorage.setItem(ACCESS_KEY, token);
  else localStorage.removeItem(ACCESS_KEY);
}
export function getToken() {
  return accessToken;
}
export function setRefreshToken(token) {
  if (token) localStorage.setItem(REFRESH_KEY, token);
  else localStorage.removeItem(REFRESH_KEY);
}
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}
// Store the tokens returned by verify-mfa / EcoID exchange / EcoID register (refreshToken kept if present).
export function setSession(data) {
  setToken((data && data.accessToken) || null);
  if (data && data.refreshToken !== undefined) setRefreshToken(data.refreshToken || null);
}
export function clearSession() {
  setToken(null);
  setRefreshToken(null);
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Endpoints that ARE the sign-in / refresh flow never trigger a refresh themselves.
const NO_REFRESH = /\/auth\/(login|verify-mfa|refresh|logout|register|verify-email|resend-code|forgot-password|reset-password|ecoid\/exchange|ecoid\/register)\b/;
const PUBLIC_PAGE = /^\/(login|register|forgot-password|reset-password|verify-email|mfa|auth\/)/;

// One shared refresh for all requests that fail at the same moment.
let refreshing = null;
function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.reject(new Error('no refresh token'));
  if (!refreshing) {
    refreshing = axios.post('/api/auth/refresh', { refreshToken })
      .then(({ data }) => {
        setToken(data.accessToken);
        if (data.refreshToken) setRefreshToken(data.refreshToken); // if the backend ever rotates
        return data.accessToken;
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

// On 401: refresh once silently and retry; only if that fails, sign out.
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config || {};
    if (error.response?.status === 401 && !original._retry && !NO_REFRESH.test(original.url || '')) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers = { ...(original.headers || {}), Authorization: `Bearer ${token}` };
        return api(original);
      } catch (e) {
        clearSession();
        if (!PUBLIC_PAGE.test(window.location.pathname)) window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// normalise backend error shape: {error:{message}} -> data.message, so every page shows the real reason
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const d = error?.response?.data;
    if (d && typeof d === 'object' && d.error && d.error.message && d.message === undefined) d.message = d.error.message;
    return Promise.reject(error);
  }
);

export default api;

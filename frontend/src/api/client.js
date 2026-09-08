import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

let accessToken = localStorage.getItem('worker_token') || null;

export function setToken(token) {
  accessToken = token;
  if (token) localStorage.setItem('worker_token', token);
  else localStorage.removeItem('worker_token');
}
export function getToken() {
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// On 401, attempt a single refresh, else bounce to login.
let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !original.url.includes('/auth/')) {
      original._retry = true;
      try {
        refreshing = refreshing || axios.post('/api/auth/refresh');
        const { data } = await refreshing;
        refreshing = null;
        setToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        setToken(null);
        window.location.href = '/login';
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

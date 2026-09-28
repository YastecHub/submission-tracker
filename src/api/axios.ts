import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      const requestUrl = String(err.config?.url ?? '');
      const isAuthBootstrap = requestUrl.includes('/api/auth/me');
      const isLogin = requestUrl.includes('/api/auth/login');
      const isPublicApi =
        requestUrl.includes('/api/events/') ||
        requestUrl.includes('/api/payment-events/slug/') ||
        requestUrl.includes('/api/submissions/status/') ||
        requestUrl.includes('/api/payment-receipts/status/') ||
        requestUrl.includes('/api/payment-receipts/my-tickets') ||
        requestUrl.includes('/api/transparency/');

      // A failed old bootstrap must not discard a newer successful login.
      const sentToken = err.config?.headers?.Authorization;
      const currentToken = localStorage.getItem('token');
      if (isLogin || isPublicApi || sentToken !== `Bearer ${currentToken}`) return Promise.reject(err);
      localStorage.removeItem('token');
      if (!isLogin && !isAuthBootstrap && !isPublicApi && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

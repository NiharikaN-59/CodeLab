import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 300000, // 5 minutes to accommodate slow free AI models
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cl_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle token expiry globally on protected requests
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthEndpoint = requestUrl.includes('/auth/login') ||
                           requestUrl.includes('/auth/google') ||
                           requestUrl.includes('/auth/register');

    // Only redirect to /login if a protected route returns 401 (expired session),
    // and do not reload if already on the login page or attempting auth.
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('cl_token');
      localStorage.removeItem('cl_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

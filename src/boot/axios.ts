import { defineBoot } from '#q-app/wrappers';
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

// Create API instance with base URL pointing to your Express backend
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API responses
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // If the error is due to an expired token (401) and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          // No refresh token available, redirect to login
          localStorage.clear();
          window.location.href = '/#/login';
          return Promise.reject(error);
        }

        // Call the refresh token endpoint
        const response = await axios.post('http://localhost:3000/api/auth/refresh-token', {
          refreshToken
        });

        // If successful, update the token and retry the original request
        const { token } = response.data;
        localStorage.setItem('token', token);

        // Update the authorization header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        } else {
          originalRequest.headers = { Authorization: `Bearer ${token}` };
        }

        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        localStorage.clear();
        window.location.href = '/#/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default defineBoot(({ app }) => {
  // for use inside Vue files through this.$axios and this.$api
  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

export { api };

import { defineBoot } from '#q-app/wrappers';
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';
import { environment } from '../config/environment';

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

// Helper functions for localStorage to prevent null errors
const getToken = (): string | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    return localStorage.getItem('token');
  } catch (e) {
    console.error('Error accessing token from localStorage', e);
    return null;
  }
};

const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    return localStorage.getItem('refreshToken');
  } catch (e) {
    console.error('Error accessing refreshToken from localStorage', e);
    return null;
  }
};

const setToken = (token: string): void => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    localStorage.setItem('token', token);
  } catch (e) {
    console.error('Error setting token in localStorage', e);
  }
};

const clearStorage = (): void => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
  } catch (e) {
    console.error('Error clearing localStorage', e);
  }
};

// Create API instance with base URL pointing to your Express backend
const api = axios.create({
  baseURL: environment.apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && config.headers) {
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
    // Return early if there's no response or no config
    if (!error.response || !error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // If the error is due to an expired token (401) and we haven't already retried
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          // No refresh token available, redirect to login
          clearStorage();
          window.location.href = '/#/login';
          return Promise.reject(error);
        }

        // Call the refresh token endpoint
        const response = await axios.post('http://localhost:3000/api/auth/refresh-token', {
          refreshToken
        });

        // If successful, update the token and retry the original request
        const { token } = response.data;
        if (!token) {
          throw new Error('No token returned from refresh endpoint');
        }

        setToken(token);

        // Update the authorization header for this request
        if (!originalRequest.headers) {
          originalRequest.headers = {};
        }
        originalRequest.headers.Authorization = `Bearer ${token}`;

        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        clearStorage();
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

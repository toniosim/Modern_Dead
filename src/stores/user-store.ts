import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import { ref, computed } from 'vue';

// Helper function to safely get items from localStorage
const getStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(`Error accessing localStorage for key: ${key}`, e);
    return null;
  }
};

// Helper function to safely set items in localStorage
const setStorageItem = (key: string, value: string): void => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`Error setting localStorage for key: ${key}`, e);
  }
};

// Helper function to safely remove items from localStorage
const removeStorageItem = (key: string): void => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Error removing localStorage for key: ${key}`, e);
  }
};

export const useUserStore = defineStore('user', () => {
  // State with default initialization to prevent null reference errors
  const token = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const userId = ref<string | null>(null);
  const username = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Initialize from localStorage (safely)
  const initializeFromStorage = (): void => {
    token.value = getStorageItem('token');
    refreshToken.value = getStorageItem('refreshToken');
    userId.value = getStorageItem('userId');
    username.value = getStorageItem('username');
  };

  // Initial load (only if in browser)
  if (typeof window !== 'undefined') {
    initializeFromStorage();
  }

  // Getters
  const isAuthenticated = computed(() => !!token.value);
  const getUserId = computed(() => userId.value);
  const getUsername = computed(() => username.value);

  // Actions
  /**
   * Register a new user
   */
  async function register(userDetails: { username: string; email: string; password: string }) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/auth/register', userDetails);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Registration failed';
      throw error.value;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Login user and store auth tokens
   */
  async function login(credentials: { email: string; password: string }) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/auth/login', credentials);
      const { token: newToken, refreshToken: newRefreshToken, userId: newUserId, username: newUsername } = response.data;

      // Validate response data to prevent null assignments
      if (!newToken || !newRefreshToken || !newUserId || !newUsername) {
        throw new Error('Invalid response from server: missing authentication data');
      }

      // Save auth data to store
      token.value = newToken;
      refreshToken.value = newRefreshToken;
      userId.value = newUserId;
      username.value = newUsername;

      // Store in localStorage (safely)
      setStorageItem('token', newToken);
      setStorageItem('refreshToken', newRefreshToken);
      setStorageItem('userId', newUserId);
      setStorageItem('username', newUsername);

      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Login failed';
      throw error.value;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Refresh the authentication token
   */
  async function refreshAuthToken() {
    if (!refreshToken.value) {
      return false;
    }

    isLoading.value = true;
    try {
      const response = await api.post('/auth/refresh-token', {
        refreshToken: refreshToken.value
      });

      const newToken = response.data.token;
      if (!newToken) {
        throw new Error('Invalid response from server: missing token');
      }

      // Update token
      token.value = newToken;

      // Update localStorage (safely)
      setStorageItem('token', newToken);

      return true;
    } catch (err) {
      // If refresh fails, log the user out
      logout();
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Logout user and clear auth data
   */
  function logout() {
    // Clear store state
    token.value = null;
    refreshToken.value = null;
    userId.value = null;
    username.value = null;

    // Clear localStorage (safely)
    removeStorageItem('token');
    removeStorageItem('refreshToken');
    removeStorageItem('userId');
    removeStorageItem('username');

    // Notify server (fire and forget)
    if (typeof window !== 'undefined') {
      api.post('/auth/logout').catch(error => {
        console.error('Error during logout:', error);
      });
    }
  }

  /**
   * Get user profile data
   */
  async function fetchUserProfile() {
    if (!userId.value || !token.value) {
      throw new Error('User not authenticated');
    }

    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get(`/users/${userId.value}`);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch profile';
      throw error.value;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    // State
    token,
    userId,
    username,
    isLoading,
    error,

    // Getters
    isAuthenticated,
    getUserId,
    getUsername,

    // Actions
    register,
    login,
    refreshAuthToken,
    logout,
    fetchUserProfile
  };
});

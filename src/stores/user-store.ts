import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import { ref, computed } from 'vue';

export const useUserStore = defineStore('user', () => {
  // State
  const token = ref<string | null>(localStorage.getItem('token'));
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'));
  const userId = ref<string | null>(localStorage.getItem('userId'));
  const username = ref<string | null>(localStorage.getItem('username'));
  const isLoading = ref(false);
  const error = ref<string | null>(null);

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

      // Save auth data
      token.value = response.data.token;
      refreshToken.value = response.data.refreshToken;
      userId.value = response.data.userId;
      username.value = response.data.username;

      // Store in localStorage
      localStorage.setItem('token', token.value);
      localStorage.setItem('refreshToken', refreshToken.value);
      localStorage.setItem('userId', userId.value);
      localStorage.setItem('username', username.value);

      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed';
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

      // Update token
      token.value = response.data.token;
      localStorage.setItem('token', token.value);

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

    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');

    // Notify server (fire and forget)
    api.post('/auth/logout').catch(console.error);
  }

  /**
   * Get user profile data
   */
  async function fetchUserProfile() {
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

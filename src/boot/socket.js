// src/boot/socket.js
import { defineBoot } from '#q-app/wrappers';
import socketService from '../services/socket.service.js';
import { useUserStore } from 'src/stores/user-store';
import { watch } from 'vue';

export default defineBoot(({ app }) => {
  // Make socket service available globally
  app.config.globalProperties.$socket = socketService;

  // Get user store
  const userStore = useUserStore();

  // Watch for authentication state changes
  watch(
    () => userStore.isAuthenticated,
    (isAuthenticated) => {
      if (isAuthenticated) {
        // If user becomes authenticated, initialize socket and authenticate
        socketService.initialize();
        socketService.authenticate(userStore.token);
      } else {
        // If user logs out, disconnect socket
        socketService.disconnect();
      }
    },
    { immediate: true } // Check initial state immediately
  );

  // Initialize socket if user is already authenticated
  if (userStore.isAuthenticated) {
    socketService.initialize();
  }
});

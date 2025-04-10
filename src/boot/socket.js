// src/boot/socket.js
import { defineBoot } from '#q-app/wrappers';
import socketService from '../services/socket.service.js';

export default defineBoot(({ app }) => {
  // Initialize socket service when app starts
  socketService.initialize();

  // Make socket service available globally
  app.config.globalProperties.$socket = socketService;
});

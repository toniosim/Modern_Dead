// src/services/socket.service.js
import { io } from 'socket.io-client';
import { useUserStore } from 'src/stores/user-store';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.authenticated = false;
    this.listeners = new Map();
  }

  // Initialize socket connection
  initialize() {
    if (this.socket) return;

    this.socket = io(process.env.SOCKET_URL || 'http://localhost:3000', {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Set up listeners for connection events
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.connected = true;

      // Attempt to authenticate with the server
      this.attemptAuthentication();
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.connected = false;
      this.authenticated = false;
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Authentication response handlers
    this.socket.on('authenticated', (data) => {
      console.log('Socket authenticated as', data.username);
      this.authenticated = true;
    });

    this.socket.on('auth_error', (error) => {
      console.error('Socket authentication failed:', error.message);
      this.authenticated = false;
    });

    // Connect the socket
    this.socket.connect();
  }

  // Attempt authentication with current token
  attemptAuthentication() {
    if (!this.socket || !this.connected) return;

    const token = localStorage.getItem('token');
    if (token) {
      this.authenticate(token);
    }
  }

  // Authenticate with the server using JWT
  authenticate(token) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('authenticate', token);
  }

  // Join a specific game location
  joinLocation(locationId) {
    if (!this.socket || !this.connected || !this.authenticated) return;
    this.socket.emit('join_location', { locationId });
  }

  // Send a chat message
  sendChatMessage(message, scope = 'local', frequency = null) {
    if (!this.socket || !this.connected || !this.authenticated) return;
    this.socket.emit('chat_message', { message, scope, frequency });
  }

  // Perform a game action
  performAction(action, targetId = null, targetName = null, additionalData = {}) {
    if (!this.socket || !this.connected || !this.authenticated) return;
    this.socket.emit('player_action', {
      action,
      targetId,
      targetName,
      ...additionalData
    });
  }

  // Move to a new location
  move(newLocation) {
    if (!this.socket || !this.connected || !this.authenticated) return;
    this.socket.emit('move', { newLocation });
  }

  // Register event listeners
  on(event, callback) {
    if (!this.socket) return;

    // Remove existing listener if present
    if (this.listeners.has(event)) {
      this.socket.off(event, this.listeners.get(event));
    }

    // Register new listener
    this.socket.on(event, callback);
    this.listeners.set(event, callback);
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.authenticated = false;
    }
  }
}

// Create and export singleton instance
const socketService = new SocketService();
export default socketService;

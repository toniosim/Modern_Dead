// src/services/socket.service.js
import { io } from 'socket.io-client';
import { environment } from 'src/config/environment';
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

    this.socket = io(environment.socketUrl, {
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

    // AP-specific events
    this.socket.on('ap_update', this.handleApUpdate.bind(this));
    this.socket.on('ap_consumed', this.handleApConsumed.bind(this));
    this.socket.on('ap_insufficient', this.handleApInsufficient.bind(this));

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

    // Get character ID if available
    const { useCharacterStore } = require('src/stores/character-store');
    const characterStore = useCharacterStore();
    const characterId = characterStore.currentCharacter?._id;

    // Send both token and character ID
    this.socket.emit('authenticate', {
      token,
      characterId
    });
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

// AP-specific event handlers
  handleApUpdate(data) {
    console.log('AP update received:', data);

    try {
      // Import here to avoid circular dependencies
      const { useCharacterStore } = require('src/stores/character-store');
      const characterStore = useCharacterStore();

      // Update AP info in store if it's the current character
      if (characterStore.currentCharacter &&
        characterStore.currentCharacter._id === data.characterId) {
        characterStore.updateApInfo(data.ap);
      }
    } catch (error) {
      console.error('Error handling AP update:', error);
    }
  }

  handleApConsumed(data) {
    console.log('AP consumed notification:', data);

    // Optional: Add any visual feedback or sound effects for AP consumption
    // This is a good place to trigger animations or notifications
  }

  handleApInsufficient(data) {
    console.log('AP insufficient notification:', data);

    // Optional: Show a notification to the user
    // Example: this could trigger a toast or in-game message
  }

// Add method to select active character
  selectCharacter(characterId) {
    if (!this.socket || !this.connected || !this.authenticated) return;
    this.socket.emit('select_character', { characterId });
  }
}

// Create and export singleton instance
const socketService = new SocketService();
export default socketService;

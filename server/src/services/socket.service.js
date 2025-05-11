const socketIO = require('socket.io');
const apService = require('./ap.service');
const Character = require('../models/character.model');
const jwt = require('jsonwebtoken');

let io;

// Store active connections by user and character ID
const activeConnections = new Map();

// Map of scheduled AP updates (to avoid duplicate update processing)
const scheduledUpdates = new Map();

/**
 * Initialize Socket.io with the HTTP server
 * @param {Server} server - HTTP/Express server
 * @returns {SocketIO.Server} - Socket.io instance
 */
const initialize = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:9000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', handleConnection);

  // Start the background AP regeneration process
  startApRegenerationProcess();

  return io;
};

/**
 * Handle new socket connections
 * @param {Socket} socket - Socket instance
 */
const handleConnection = (socket) => {
  console.log('A user connected:', socket.id);

  // Handle authentication
  socket.on('authenticate', (data) => {
    try {
      console.log('Socket authentication attempt:', {
        tokenPresent: !!data.token,
        characterId: data.characterId
      });

      // Verify JWT token
      const decoded = jwt.verify(data.token, process.env.JWT_SECRET);

      // Associate user data with socket
      socket.userId = decoded.userId;
      socket.username = decoded.username;

      // Add characterId if provided
      if (data.characterId) {
        socket.characterId = data.characterId;

        // Store the connection information
        if (!activeConnections.has(decoded.userId)) {
          activeConnections.set(decoded.userId, new Map());
        }

        activeConnections.get(decoded.userId).set(data.characterId, socket);

        // Subscribe to character-specific room
        socket.join(`character:${data.characterId}`);

        // Send initial AP update
        sendApUpdate(decoded.userId, data.characterId);
      }

      // Join user to their personal room
      socket.join(`user:${decoded.userId}`);

      console.log(`User authenticated: ${decoded.username}`);

      // Notify client of successful authentication
      socket.emit('authenticated', {
        username: decoded.username,
        characterId: socket.characterId
      });
    } catch (error) {
      console.error('Authentication failed:', error.message);
      socket.emit('auth_error', { message: 'Authentication failed' });
    }
  });

  // Handle map-related events
  socket.on('join_location', (data) => {
    // Check if user is authenticated
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Remove from previous location room if any
    if (socket.currentLocation) {
      socket.leave(`location:${socket.currentLocation}`);
    }

    // Join new location room
    const locationKey = `${data.x},${data.y}`;
    socket.join(`location:${locationKey}`);
    socket.currentLocation = locationKey;

    // Notify other players in the same location
    socket.to(`location:${locationKey}`).emit('player_joined', {
      username: socket.username,
    });
  });

  // Handle character selection
  socket.on('select_character', (data) => {
    if (!socket.userId || !data.characterId) {
      socket.emit('error', { message: 'Invalid data' });
      return;
    }

    // Update socket data
    socket.characterId = data.characterId;

    // Store connection info
    if (!activeConnections.has(socket.userId)) {
      activeConnections.set(socket.userId, new Map());
    }

    activeConnections.get(socket.userId).set(data.characterId, socket);

    // Subscribe to character-specific room
    socket.join(`character:${data.characterId}`);

    // Send initial AP update
    sendApUpdate(socket.userId, data.characterId);
  });

  // Handle player movement
  socket.on('player_moved', (data) => {
    // Validate user is authenticated
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Notify players in both old and new locations
    if (socket.currentLocation) {
      socket.to(`location:${socket.currentLocation}`).emit('player_left', {
        username: socket.username
      });

      // Leave old location room
      socket.leave(`location:${socket.currentLocation}`);
    }

    // Update current location
    const newLocationKey = `${data.x},${data.y}`;
    socket.currentLocation = newLocationKey;
    socket.join(`location:${newLocationKey}`);

    socket.to(`location:${newLocationKey}`).emit('player_joined', {
      username: socket.username,
      character: {
        ...data,
        name: socket.username,
        type: data.type || 'survivor'
      }
    });
  });

  // Handle building interaction
  socket.on('building_interaction', (data) => {
    // Check if user is authenticated
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Notify other players in the same location
    if (socket.currentLocation) {
      socket.to(`location:${socket.currentLocation}`).emit('building_updated', {
        username: socket.username,
        buildingId: data.buildingId,
        action: data.action,
        result: data.result
      });
    }
  });

  // Handle test events
  socket.on('test_event', (data) => {
    console.log('Received test event:', data);
    socket.emit('test_response', {
      message: 'Test message received',
      timestamp: new Date().toISOString(),
      received: data
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    try {
      console.log('User disconnected:', socket.id);

      // Notify other players if the user was authenticated
      if (socket.username && socket.currentLocation) {
        socket.to(`location:${socket.currentLocation}`).emit('player_left', {
          username: socket.username
        });
      }

      // Clean up active connections
      const { userId, characterId } = socket;
      if (userId && characterId && activeConnections.has(userId)) {
        activeConnections.get(userId).delete(characterId);

        if (activeConnections.get(userId).size === 0) {
          activeConnections.delete(userId);
        }
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });
};

// Send AP update to a specific character
const sendApUpdate = async (userId, characterId) => {
  try {
    if (!characterId) return;

    // Get the character
    const character = await Character.findOne({ _id: characterId, user: userId });

    if (!character) {
      console.error(`Character ${characterId} not found for user ${userId}`);
      return;
    }

    // Calculate current AP
    const currentAp = await apService.calculateAvailableAp(character, true);
    const maxAp = character.actions.maxActions;
    const regenerationRate = await apService.getRegenerationRate(character);

    // Calculate time until next AP
    const timeUntilNext = await apService.getTimeUntilNextAp(character);

    // Create message payload
    const payload = {
      characterId,
      ap: {
        current: currentAp,
        max: maxAp,
        regenerationRate,
        nextApIn: timeUntilNext
      }
    };

    // Send update to all connections for this character
    io.to(`character:${characterId}`).emit('ap_update', payload);

    return payload;
  } catch (error) {
    console.error('Error sending AP update:', error);
  }
};

// Notify about AP consumption
const sendApConsumed = async (userId, characterId, amount, actionType) => {
  try {
    // Get socket for this character
    if (!activeConnections.has(userId)) return;

    // Send to all sockets for this character
    io.to(`character:${characterId}`).emit('ap_consumed', {
      characterId,
      amount,
      actionType,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error sending AP consumed notification:', error);
  }
};

// Notify about insufficient AP
const sendApInsufficient = async (userId, characterId, required, available, actionType) => {
  try {
    // Send to all sockets for this character
    io.to(`character:${characterId}`).emit('ap_insufficient', {
      characterId,
      required,
      available,
      actionType,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error sending AP insufficient notification:', error);
  }
};

// Start AP regeneration process
const startApRegenerationProcess = () => {
  // Run AP regeneration check every minute
  setInterval(async () => {
    try {
      await processApRegeneration();
    } catch (error) {
      console.error('Error processing AP regeneration:', error);
    }
  }, 60000); // Every minute

  console.log('AP regeneration process started');
};

// Process AP regeneration for all active characters
const processApRegeneration = async () => {
  // Get all active characters (those that have been active in the last 24 hours)
  const activeTime = new Date();
  activeTime.setHours(activeTime.getHours() - 24);

  const activeCharacters = await Character.find({
    lastActive: { $gte: activeTime },
    $expr: { $lt: ["$actions.availableActions", "$actions.maxActions"] }
  });

  console.log(`Processing AP regeneration for ${activeCharacters.length} characters`);

  // Process in batches to avoid overloading the server
  const batchSize = 50;
  for (let i = 0; i < activeCharacters.length; i += batchSize) {
    const batch = activeCharacters.slice(i, i + batchSize);

    // Process each character in parallel
    await Promise.all(batch.map(async (character) => {
      // Skip if an update is already scheduled for this character
      if (scheduledUpdates.has(character._id.toString())) {
        return;
      }

      try {
        // Calculate new AP
        const userId = character.user.toString();
        const characterId = character._id.toString();

        // Mark as scheduled
        scheduledUpdates.set(characterId, true);

        // Only update if not at max AP
        if (character.actions.availableActions < character.actions.maxActions) {
          // Calculate AP based on time elapsed
          await apService.calculateAvailableAp(character, true);

          // Send update to connected client(s)
          if (activeConnections.has(userId) && activeConnections.get(userId).has(characterId)) {
            await sendApUpdate(userId, characterId);
          }
        }

        // Clear scheduled flag
        scheduledUpdates.delete(characterId);
      } catch (error) {
        // Clear scheduled flag on error
        scheduledUpdates.delete(character._id.toString());
        console.error(`Error updating AP for character ${character._id}:`, error);
      }
    }));
  }
};

// Handle player reconnection (called when a player logs in)
const handlePlayerReconnection = async (userId, characterId) => {
  try {
    // Get the character
    const character = await Character.findOne({ _id: characterId, user: userId });

    if (!character) {
      console.error(`Character ${characterId} not found for user ${userId}`);
      return;
    }

    // Calculate AP accumulated while offline
    await apService.calculateAvailableAp(character, true);

    // Send update through socket if player is connected
    if (activeConnections.has(userId) && activeConnections.get(userId).has(characterId)) {
      await sendApUpdate(userId, characterId);
    }

    return {
      success: true,
      message: 'AP updated for reconnected player',
      character
    };
  } catch (error) {
    console.error('Error handling player reconnection:', error);
    return {
      success: false,
      message: 'Failed to update AP for reconnected player'
    };
  }
};

module.exports = {
  initialize,
  sendApUpdate,
  sendApConsumed,
  sendApInsufficient,
  handlePlayerReconnection,
  io: () => io
};

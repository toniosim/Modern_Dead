const socketIO = require('socket.io');
const apService = require('./ap.service');
const Character = require('../models/character.model');

let io;

// Store active connections by user and character ID
const activeConnections = new Map();

// Map of scheduled AP updates (to avoid duplicate update processing)
const scheduledUpdates = new Map();

// Initialize Socket.io with the HTTP server
const initialize = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:8080',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', handleConnection);

  // Start the background AP regeneration process
  startApRegenerationProcess();

  return io;
};

// Handle new socket connections
const handleConnection = (socket) => {
  // Authenticate the socket connection
  socket.on('authenticate', async (data) => {
    try {
      const { userId, characterId } = data;

      if (!userId) {
        socket.emit('authentication_error', { message: 'User ID is required' });
        return;
      }

      // Store the connection information
      socket.userId = userId;
      socket.characterId = characterId;

      // Add to active connections
      if (!activeConnections.has(userId)) {
        activeConnections.set(userId, new Map());
      }

      if (characterId) {
        activeConnections.get(userId).set(characterId, socket);

        // Subscribe to character-specific room
        socket.join(`character:${characterId}`);

        // Send initial AP update
        await sendApUpdate(userId, characterId);
      }

      // Subscribe to user-specific room
      socket.join(`user:${userId}`);

      socket.emit('authentication_success', { userId, characterId });

      console.log(`User ${userId} authenticated with character ${characterId || 'none'}`);
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('authentication_error', { message: 'Failed to authenticate' });
    }
  });

  // Handle character selection
  socket.on('select_character', async (data) => {
    try {
      const { characterId } = data;
      const userId = socket.userId;

      if (!userId || !characterId) {
        socket.emit('character_selection_error', { message: 'User ID and Character ID are required' });
        return;
      }

      // Leave previous character room if any
      if (socket.characterId) {
        socket.leave(`character:${socket.characterId}`);

        // Remove from active connections
        if (activeConnections.has(userId)) {
          activeConnections.get(userId).delete(socket.characterId);
        }
      }

      // Update socket character ID
      socket.characterId = characterId;

      // Add to active connections
      if (!activeConnections.has(userId)) {
        activeConnections.set(userId, new Map());
      }
      activeConnections.get(userId).set(characterId, socket);

      // Join new character room
      socket.join(`character:${characterId}`);

      // Send initial AP update
      await sendApUpdate(userId, characterId);

      socket.emit('character_selection_success', { characterId });

      console.log(`User ${userId} selected character ${characterId}`);
    } catch (error) {
      console.error('Character selection error:', error);
      socket.emit('character_selection_error', { message: 'Failed to select character' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    try {
      const { userId, characterId } = socket;

      if (userId && characterId && activeConnections.has(userId)) {
        activeConnections.get(userId).delete(characterId);

        if (activeConnections.get(userId).size === 0) {
          activeConnections.delete(userId);
        }
      }

      console.log(`User ${userId || 'unknown'} disconnected`);
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
    'actions.availableActions': { $lt: '$actions.maxActions' } // Only those not at max AP
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

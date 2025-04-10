// src/app.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const http = require('http');
const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const testRoutes = require('./routes/test.routes');
const authRoutes = require('./routes/auth.routes');
const { errorHandler } = require('./middleware/error.middleware');
const { checkJwtConfig } = require('./middleware/jwt-config.middleware');

// Import database connection
const connectDB = require('./config/database');

// Create Express app
const app = express();

// Set up Socket.io
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:9000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Apply middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:9000',
  credentials: true
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Check JWT configuration for auth routes
app.use('/api/auth', checkJwtConfig);

// Connect to MongoDB
connectDB();

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Modern Dead API' });
});

// API routes
app.use('/api/test', testRoutes);
app.use('/api/auth', authRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle authentication
  socket.on('authenticate', (token) => {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Associate user data with socket
      socket.userId = decoded.userId;
      socket.username = decoded.username;

      // Join user to their personal room
      socket.join(`user:${decoded.userId}`);

      console.log(`User authenticated: ${decoded.username}`);

      // Notify client of successful authentication
      socket.emit('authenticated', { username: decoded.username });
    } catch (error) {
      console.error('Authentication failed:', error.message);
      socket.emit('auth_error', { message: 'Authentication failed' });
    }
  });

  // Game-specific events
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
    socket.join(`location:${data.locationId}`);
    socket.currentLocation = data.locationId;

    // Notify other players in the same location
    socket.to(`location:${data.locationId}`).emit('player_joined', {
      username: socket.username,
      // Include other player data here
    });
  });

  // Handle player actions
  socket.on('player_action', (data) => {
    // Check if user is authenticated
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    console.log(`Player action from ${socket.username}:`, data.action);

    // Process the action (you'll implement this later)
    // ...

    // Broadcast results to affected players
    if (data.action === 'attack') {
      // Notify the target player
      io.to(`user:${data.targetId}`).emit('player_attacked', {
        attacker: socket.username,
        damage: data.damage
      });

      // Notify others in the same location
      socket.to(`location:${socket.currentLocation}`).emit('combat_event', {
        attacker: socket.username,
        target: data.targetName,
        action: 'attack'
      });
    }
  });

  // Handle chat messages
  socket.on('chat_message', (data) => {
    // Validate user is authenticated
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Determine message scope (local, radio, etc.)
    if (data.scope === 'local') {
      // Send to everyone in the same location
      io.to(`location:${socket.currentLocation}`).emit('chat_message', {
        username: socket.username,
        message: data.message,
        timestamp: new Date().toISOString()
      });
    } else if (data.scope === 'radio' && data.frequency) {
      // Send to everyone tuned to the same radio frequency
      io.to(`radio:${data.frequency}`).emit('radio_message', {
        username: socket.username,
        message: data.message,
        frequency: data.frequency,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle player movement
  socket.on('move', (data) => {
    // Validate user is authenticated
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Handle player movement logic (will be implemented later)
    // ...

    // Notify players in both old and new locations
    socket.to(`location:${socket.currentLocation}`).emit('player_left', {
      username: socket.username
    });

    // Update current location
    socket.currentLocation = data.newLocation;
    socket.join(`location:${data.newLocation}`);

    socket.to(`location:${data.newLocation}`).emit('player_joined', {
      username: socket.username
    });
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
    console.log('User disconnected:', socket.id);

    // Notify other players if the user was authenticated
    if (socket.username && socket.currentLocation) {
      socket.to(`location:${socket.currentLocation}`).emit('player_left', {
        username: socket.username
      });
    }
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };

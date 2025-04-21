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
const characterRoutes = require('./routes/character.routes');
const mapRoutes = require('./routes/map.routes'); // Add map routes import
const { errorHandler } = require('./middleware/error.middleware');
const { databaseErrorHandler } = require('./middleware/database-error.middleware');
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
app.use('/api/characters', characterRoutes);
app.use('/api/map', mapRoutes); // Add map routes

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
    socket.join(`location:${data.x},${data.y}`);
    socket.currentLocation = `${data.x},${data.y}`;

    // Notify other players in the same location
    socket.to(`location:${data.x},${data.y}`).emit('player_joined', {
      username: socket.username,
      // Include other player data here
    });
  });

  // Handle player movement
  socket.on('player_moved', (data) => {
    // Validate user is authenticated
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Notify players in both old and new locations
    socket.to(`location:${socket.currentLocation}`).emit('player_left', {
      username: socket.username
    });

    // Leave old location room
    if (socket.currentLocation) {
      socket.leave(`location:${socket.currentLocation}`);
    }

    // Update current location
    socket.currentLocation = `${data.x},${data.y}`;
    socket.join(`location:${socket.currentLocation}`);

    socket.to(`location:${socket.currentLocation}`).emit('player_joined', {
      username: socket.username,
      character: {
        ...data,
        name: socket.username,
        type: 'survivor' // This would come from the database normally
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
    socket.to(`location:${socket.currentLocation}`).emit('building_updated', {
      username: socket.username,
      buildingId: data.buildingId,
      action: data.action,
      result: data.result
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

// Error handlers
app.use(databaseErrorHandler);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };

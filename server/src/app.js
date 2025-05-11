// src/app.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const http = require('http');
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

// Import the socket service
const socketService = require('./services/socket.service');

// Set up Socket.io
const server = http.createServer(app);

// Initialize socket service with the server
socketService.initialize(server);

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
app.use('/api/map', mapRoutes);
// debug routes
const debugRoutes = require('./routes/debug.routes');
const {io} = require("socket.io-client");
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/debug', debugRoutes);
}

// Error handlers
app.use(databaseErrorHandler);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };

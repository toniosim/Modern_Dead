// src/config/database.js
const mongoose = require('mongoose');

// MongoDB connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // Connection pool settings
  poolSize: process.env.MONGODB_POOL_SIZE || 10,
  // Max number of socket connections
  maxPoolSize: process.env.MONGODB_MAX_POOL_SIZE || 50,
  // Min number of socket connections
  minPoolSize: process.env.MONGODB_MIN_POOL_SIZE || 5,
  // Socket timeout
  socketTimeoutMS: 45000,
  // Connection timeout
  connectTimeoutMS: 10000,
  // How long to wait for server selection
  serverSelectionTimeoutMS: 5000,
  // How long to wait for new connections
  waitQueueTimeoutMS: 5000,
  // Automatically build indexes
  autoIndex: process.env.NODE_ENV !== 'production',
  // Enable auto-reconnect attempts
  autoReconnect: true,
  // Reconnect time in ms
  reconnectTries: Number.MAX_VALUE,
  reconnectInterval: 1000,
  // Buffer commands until connection restored
  bufferCommands: true,
  // Query timeout
  maxTimeMS: 30000
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB at:', process.env.MONGODB_URI);
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/modern-dead', options);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Setup global plugins for all schemas
    // (This runs before any model is defined)
    mongoose.plugin(function(schema) {
      // Add automatic timestamps to all schemas
      if (!schema.options.timestamps) {
        schema.set('timestamps', true);
      }

      // Add version key for optimistic concurrency control
      if (!schema.options.versionKey) {
        schema.set('versionKey', '_version');
      }

      // Add toJSON transform to remove sensitive fields
      schema.options.toJSON = {
        transform: function(doc, ret) {
          delete ret.__v;
          return ret;
        }
      };
    });

    // Set up event listeners for connection
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Handle app termination - close connection properly
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

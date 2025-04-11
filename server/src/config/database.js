// src/config/database.js
const mongoose = require('mongoose');

// MongoDB connection options
const options = {
  // MongoDB 8.0 connection options
  // These are recommended settings for the latest MongoDB versions
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB at:', process.env.MONGODB_URI);
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/modern-dead');
    console.log(`MongoDB Connected: ${conn.connection.host}`);

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

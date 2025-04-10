// src/scripts/test-db-connection.js
require('dotenv').config({ path: '../.env' });
const connectDB = require('../config/database');

const testConnection = async () => {
  try {
    const conn = await connectDB();
    console.log('MongoDB connection test successful!');
    console.log(`Connected to database: ${conn.connection.name}`);
    console.log(`MongoDB version: ${conn.version}`);

    // Close connection after test
    await conn.connection.close();
    console.log('Connection closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Connection test failed:', error);
    process.exit(1);
  }
};

testConnection();

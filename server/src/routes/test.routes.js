// src/routes/test.routes.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

router.get('/ping', (req, res) => {
  res.json({
    message: 'Pong!',
    timestamp: new Date().toISOString(),
    serverInfo: {
      name: 'Modern Dead API',
      version: '0.1.0'
    }
  });
});

// Add database connection test endpoint
router.get('/db-connection', async (req, res) => {
  try {
    // Check if connected to MongoDB
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        connected: false,
        message: 'Not connected to MongoDB'
      });
    }

    // Get database information
    const dbName = mongoose.connection.name;
    const version = mongoose.version;

    // Get list of collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Return successful response with database info
    res.json({
      connected: true,
      databaseName: dbName,
      version: version,
      collections: collectionNames
    });
  } catch (error) {
    console.error('Error in database connection test:', error);
    res.status(500).json({
      connected: false,
      message: error.message
    });
  }
});

module.exports = router;

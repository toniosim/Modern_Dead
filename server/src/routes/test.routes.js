// src/routes/test.routes.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const MapCell = require('../models/map.model');
const Building = require('../models/building.model');
const Suburb = require('../models/suburb.model');

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

// Add map generation test endpoint
router.get('/map-generation', async (req, res) => {
  try {
    // Count map cells
    const mapCellCount = await MapCell.countDocuments();

    // Count buildings
    const buildingCount = await Building.countDocuments();

    // Count suburbs
    const suburbCount = await Suburb.countDocuments();

    res.json({
      mapCells: mapCellCount,
      buildings: buildingCount,
      suburbs: suburbCount,
      streetCells: mapCellCount - buildingCount,
      buildingPercentage: ((buildingCount / mapCellCount) * 100).toFixed(2) + '%'
    });
  } catch (error) {
    console.error('Error in map generation test:', error);
    res.status(500).json({
      error: error.message || 'Failed to test map generation'
    });
  }
});

// Get sample buildings
router.get('/sample-buildings', async (req, res) => {
  try {
    // Get 10 random buildings
    const buildings = await Building.aggregate([
      { $sample: { size: 10 } }
    ]);

    res.json({
      buildings
    });
  } catch (error) {
    console.error('Error getting sample buildings:', error);
    res.status(500).json({
      error: error.message || 'Failed to get sample buildings'
    });
  }
});

// Get map cells in area
router.get('/map-area/:x/:y/:radius?', async (req, res) => {
  try {
    const x = parseInt(req.params.x);
    const y = parseInt(req.params.y);
    const radius = parseInt(req.params.radius || 1);

    if (isNaN(x) || isNaN(y) || isNaN(radius)) {
      return res.status(400).json({
        error: 'Invalid coordinates or radius'
      });
    }

    // Calculate bounds
    const minX = Math.max(0, x - radius);
    const maxX = Math.min(99, x + radius);
    const minY = Math.max(0, y - radius);
    const maxY = Math.min(99, y + radius);

    // Get cells in area
    const cells = await MapCell.find({
      x: { $gte: minX, $lte: maxX },
      y: { $gte: minY, $lte: maxY }
    }).populate('building').populate('suburb');

    res.json({
      center: { x, y },
      radius,
      bounds: { minX, maxX, minY, maxY },
      cells
    });
  } catch (error) {
    console.error('Error getting map area:', error);
    res.status(500).json({
      error: error.message || 'Failed to get map area'
    });
  }
});

module.exports = router;

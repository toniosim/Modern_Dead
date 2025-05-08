const express = require('express');
const router = express.Router();
const mapController = require('../controllers/map.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get map area around character
router.get('/area/:characterId', mapController.getMapArea);

// Move character to new location
router.post('/move/:characterId', mapController.moveCharacter);

// Get building details
router.get('/building/:buildingId', mapController.getBuilding);

// Interact with a building
router.post('/interact/:characterId/:buildingId', mapController.interactWithBuilding);

// Enter building
router.post('/enter-building/:characterId', mapController.enterBuilding);

// Exit building
router.post('/exit-building/:characterId', mapController.exitBuilding);

module.exports = router;

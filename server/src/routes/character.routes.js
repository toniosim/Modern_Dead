// server/src/routes/character.routes.js
const express = require('express');
const router = express.Router();
const characterController = require('../controllers/character.controller');
const { authenticate } = require('../middleware/auth.middleware');
const apMiddleware = require('../middleware/ap.middleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all characters for a user
router.get('/', characterController.getUserCharacters);

// Get a single character by ID
router.get('/:id', characterController.getCharacter);

// Create a new character
router.post('/', characterController.createCharacter);

// Update character state (alive/dead)
router.patch('/:id/state', characterController.updateCharacterState);

// Add skill to character
router.post('/:id/skills', characterController.addSkill);

// Get character AP information
router.get('/:id/ap', characterController.getCharacterAP);

// Handle resting (for AP regeneration)
router.post('/rest', apMiddleware.handleResting);

// Delete a character
router.delete('/:id', characterController.deleteCharacter);

module.exports = router;

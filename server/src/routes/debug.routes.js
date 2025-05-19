const express = require('express');
const router = express.Router();
const Character = require('../models/character.model');
const Building = require('../models/building.model');
const { authenticate } = require('../middleware/auth.middleware');

// Protect all debug routes
router.use(authenticate);

// Only allow in development mode
router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not available in production' });
  }
  next();
});

// Set AP for a character
router.post('/set-ap', async (req, res, next) => {
  try {
    const { characterId, amount } = req.body;

    if (!characterId || amount === undefined) {
      return res.status(400).json({ message: 'characterId and amount are required' });
    }

    // Find the character
    const character = await Character.findOne({
      _id: characterId,
      user: req.user.userId
    });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Set AP value
    character.actions.availableActions = Math.min(
      Math.max(1, amount),
      character.actions.maxActions
    );
    character.actions.lastActionTime = new Date();

    await character.save();

    res.json({
      message: 'AP updated successfully',
      character: {
        id: character._id,
        name: character.name,
        actions: character.actions
      }
    });
  } catch (error) {
    next(error);
  }
});

// Max out AP for a character
router.post('/max-ap', async (req, res, next) => {
  try {
    const { characterId } = req.body;

    if (!characterId) {
      return res.status(400).json({ message: 'characterId is required' });
    }

    // Find the character
    const character = await Character.findOne({
      _id: characterId,
      user: req.user.userId
    });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Set AP to max
    character.actions.availableActions = character.actions.maxActions;
    character.actions.lastActionTime = new Date();

    await character.save();

    res.json({
      message: 'AP maxed out successfully',
      character: {
        id: character._id,
        name: character.name,
        actions: character.actions
      }
    });
  } catch (error) {
    next(error);
  }
});

// Teleport a character to specific coordinates
router.post('/teleport', async (req, res, next) => {
  try {
    const { characterId, x, y } = req.body;

    if (!characterId || x === undefined || y === undefined) {
      return res.status(400).json({ message: 'characterId, x, and y are required' });
    }

    // Find the character
    const character = await Character.findOne({
      _id: characterId,
      user: req.user.userId
    });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Validate coordinates
    const targetX = Math.min(Math.max(0, x), 99);
    const targetY = Math.min(Math.max(0, y), 99);

    // Get cell at target coordinates
    const MapCell = require('../models/map.model');
    const targetCell = await MapCell.findOne({ x: targetX, y: targetY })
      .populate('building').populate('suburb');

    if (!targetCell) {
      return res.status(404).json({ message: 'Invalid map coordinates' });
    }

    // Update character location
    character.location.x = targetX;
    character.location.y = targetY;

    // Set building reference if applicable
    if (targetCell.type === 'building' && targetCell.building) {
      character.location.buildingId = targetCell.building._id;
      character.location.areaName = `${targetCell.suburb.name} - ${targetCell.building.name}`;
    } else {
      character.location.buildingId = null;
      character.location.areaName = `${targetCell.suburb.name} - Street`;
    }

    await character.save();

    res.json({
      message: 'Character teleported successfully',
      character: {
        id: character._id,
        name: character.name,
        location: character.location
      }
    });
  } catch (error) {
    next(error);
  }
});

// Find nearest building of a specific type
router.get('/find-building/:type', async (req, res, next) => {
  try {
    const { type } = req.params;
    const { characterId } = req.query;

    if (!type) {
      return res.status(400).json({ message: 'Building type is required' });
    }

    // Find a building of the specified type
    let startX = 0;
    let startY = 0;

    // If character ID provided, use their location as starting point
    if (characterId) {
      const character = await Character.findById(characterId);
      if (character) {
        startX = character.location.x;
        startY = character.location.y;
      }
    }

    // Find all buildings of this type
    const buildings = await Building.find({ type });

    if (!buildings || buildings.length === 0) {
      return res.status(404).json({ message: 'No buildings of this type found' });
    }

    // Find nearest building
    let nearestBuilding = null;
    let minDistance = Infinity;

    for (const building of buildings) {
      const distance = Math.sqrt(
        Math.pow(building.location.x - startX, 2) +
        Math.pow(building.location.y - startY, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestBuilding = building;
      }
    }

    res.json({
      x: nearestBuilding.location.x,
      y: nearestBuilding.location.y,
      name: nearestBuilding.name,
      buildingId: nearestBuilding._id
    });
  } catch (error) {
    next(error);
  }
});

// Remove skill from a character (debug only)
router.post('/remove-skill', async (req, res, next) => {
  try {
    const { characterId, skillName } = req.body;

    if (!characterId || !skillName) {
      return res.status(400).json({ message: 'characterId and skillName are required' });
    }

    // Find the character
    const character = await Character.findOne({
      _id: characterId,
      user: req.user.userId
    });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Check if character has the skill
    const skillIndex = character.skills.findIndex(skill => skill.name === skillName);

    if (skillIndex === -1) {
      return res.status(404).json({ message: `Skill "${skillName}" not found on this character` });
    }

    // Remove the skill
    character.skills.splice(skillIndex, 1);
    await character.save();

    res.json({
      message: `Skill "${skillName}" removed successfully`,
      character: {
        id: character._id,
        name: character.name,
        skills: character.skills
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/add-xp', async (req, res, next) => {
  try {
    const { characterId, amount } = req.body;

    if (!characterId || amount === undefined || amount <= 0) {
      return res.status(400).json({ message: 'characterId and a positive amount are required' });
    }

    // Find the character
    const character = await Character.findOne({
      _id: characterId,
      user: req.user.userId
    });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Add XP
    character.experience += amount;

    // Save character
    await character.save();

    res.json({
      message: `Added ${amount} XP successfully`,
      character: {
        id: character._id,
        name: character.name,
        experience: character.experience,
        level: character.level
      }
    });
  } catch (error) {
    next(error);
  }
});

// Set exact XP amount for a character (debug only)
router.post('/set-xp', async (req, res, next) => {
  try {
    const { characterId, amount } = req.body;

    if (!characterId || amount === undefined || amount < 0) {
      return res.status(400).json({ message: 'characterId and a non-negative amount are required' });
    }

    // Find the character
    const character = await Character.findOne({
      _id: characterId,
      user: req.user.userId
    });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Set XP
    character.experience = amount;

    // Save character
    await character.save();

    res.json({
      message: `Set XP to ${amount} successfully`,
      character: {
        id: character._id,
        name: character.name,
        experience: character.experience,
        level: character.level
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

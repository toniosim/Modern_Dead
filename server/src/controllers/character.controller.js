// server/src/controllers/character.controller.js
const Character = require('../models/character.model');
const User = require('../models/user.model');
const { CHARACTER_CLASSES, getRandomMeleeWeapon } = require('../utils/character-classes.util');
const mongoose = require('mongoose');

// Get all characters for a user
exports.getUserCharacters = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const characters = await Character.find({ user: userId });

    res.status(200).json(characters);
  } catch (error) {
    next(error);
  }
};

// Get a single character by ID
exports.getCharacter = async (req, res, next) => {
  try {
    const characterId = req.params.id;
    const userId = req.user.userId;

    const character = await Character.findOne({
      _id: characterId,
      user: userId
    });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    res.status(200).json(character);
  } catch (error) {
    next(error);
  }
};

// Create a new character
exports.createCharacter = async (req, res, next) => {
  try {
    const { name, classGroup, subClass } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!name || !classGroup || !subClass) {
      return res.status(400).json({ message: 'Name, class group, and subclass are required' });
    }

    // Check if class and subclass are valid
    if (!CHARACTER_CLASSES[classGroup] || !CHARACTER_CLASSES[classGroup][subClass]) {
      return res.status(400).json({ message: 'Invalid class or subclass' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has max characters (3 in this example)
    const characterCount = await Character.countDocuments({ user: userId });
    if (characterCount >= 3) {
      return res.status(400).json({ message: 'Maximum character limit reached' });
    }

    // Handle special case for Consumer class (random melee weapon)
    if (classGroup === 'CIVILIAN' && subClass === 'CONSUMER') {
      const classDefinition = CHARACTER_CLASSES[classGroup][subClass];
      const randomWeapon = getRandomMeleeWeapon();

      // Replace "Random Melee Weapon" with the actual weapon
      classDefinition.startingEquipment = classDefinition.startingEquipment.map(item => {
        if (item.item === 'Random Melee Weapon') {
          return { item: randomWeapon, quantity: item.quantity };
        }
        return item;
      });
    }

    // Create the character
    const character = await Character.createCharacter({
      user: userId,
      name,
      classGroup,
      subClass
    });

    res.status(201).json(character);
  } catch (error) {
    next(error);
  }
};

// Update character state (alive/dead)
exports.updateCharacterState = async (req, res, next) => {
  try {
    const characterId = req.params.id;
    const userId = req.user.userId;
    const { newState } = req.body;

    // Validate input
    if (!newState || !['alive', 'dead'].includes(newState)) {
      return res.status(400).json({ message: 'Valid newState (alive/dead) is required' });
    }

    // Find character
    const character = await Character.findOne({
      _id: characterId,
      user: userId
    });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Update state
    if (newState === 'alive') {
      if (character.type === 'survivor') {
        return res.status(400).json({ message: 'Character is already alive' });
      }
      await character.revive();
    } else {
      if (character.type === 'zombie') {
        return res.status(400).json({ message: 'Character is already dead' });
      }
      await character.die();
    }

    res.status(200).json(character);
  } catch (error) {
    next(error);
  }
};

// Add skill to character
exports.addSkill = async (req, res, next) => {
  try {
    const characterId = req.params.id;
    const userId = req.user.userId;
    const { skillName } = req.body;

    // Validate input
    if (!skillName) {
      return res.status(400).json({ message: 'Skill name is required' });
    }

    // Find character
    const character = await Character.findOne({
      _id: characterId,
      user: userId
    });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Add skill
    try {
      await character.addSkill(skillName);
      res.status(200).json(character);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  } catch (error) {
    next(error);
  }
};

// Get character AP information
exports.getCharacterAP = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Find character
    const character = await Character.findOne({
      _id: id,
      user: userId
    });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Get AP service
    const apService = require('../services/ap.service');

    // Update AP based on time elapsed
    await apService.calculateAvailableAp(character, true);

    // Get time until next AP
    const nextApInfo = await apService.getTimeUntilNextAp(character);

    // Return AP information
    res.json({
      success: true,
      ap: {
        current: character.actions.availableActions,
        max: character.actions.maxActions,
        regenerationRate: character.actions.regenerationRate + (character.actions.bonusRegeneration || 0),
        nextApIn: nextApInfo
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a character
exports.deleteCharacter = async (req, res, next) => {
  try {
    const characterId = req.params.id;
    const userId = req.user.userId;

    const result = await Character.deleteOne({
      _id: characterId,
      user: userId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Character not found' });
    }

    res.status(200).json({ message: 'Character deleted successfully' });
  } catch (error) {
    next(error);
  }
};

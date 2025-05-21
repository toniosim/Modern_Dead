const movementService = require('../services/movement.service');
const Character = require('../models/character.model');
const Building = require('../models/building.model');
const actionCosts = require('../config/action-costs.config');

/**
 * Get map area around character
 */
exports.getMapArea = async (req, res, next) => {
  try {
    const { characterId } = req.params;

    // Get character
    const character = await Character.findOne({
      _id: characterId,
      user: req.user.userId
    });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Get visible area
    const mapArea = await movementService.getVisibleArea(
      character.location.x,
      character.location.y,
      'standard'
    );

    // Get characters in the visible area
    const visibleCharacters = [];
    for (let row of mapArea.grid) {
      for (let cell of row) {
        if (cell) {
          const charactersInCell = await movementService.getCharactersAtLocation(
            cell.x,
            cell.y,
            cell.type === 'building'
          );

          if (charactersInCell.length > 0) {
            visibleCharacters.push({
              x: cell.x,
              y: cell.y,
              characters: charactersInCell.map(c => ({
                id: c._id,
                name: c.name,
                type: c.type,
                health: c.health,
                isCurrentCharacter: c._id.toString() === character._id.toString()
              }))
            });
          }
        }
      }
    }

    // Return map area with characters
    res.json({
      mapArea,
      visibleCharacters,
      character: {
        id: character._id,
        name: character.name,
        type: character.type,
        location: character.location,
        health: character.health,
        actions: character.actions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Move character to new location
 */
exports.moveCharacter = async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const { x, y } = req.body;

    // Validate input
    if (x === undefined || y === undefined) {
      return res.status(400).json({ message: 'Target coordinates are required' });
    }

    // Parse coordinates
    const targetX = parseInt(x, 10);
    const targetY = parseInt(y, 10);

    if (isNaN(targetX) || isNaN(targetY)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Log request info
    console.log(`Move request for character ${characterId} to [${x}, ${y}]`);

    // Get character
    const character = await Character.findOne({
      _id: characterId,
      user: req.user.userId
    });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Validate move
    const validationResult = await movementService.isValidMove(character, targetX, targetY);

    if (!validationResult.valid) {
      return res.status(400).json({
        message: 'Invalid move',
        reason: validationResult.reason
      });
    }

    // Move character
    const updatedCharacter = await movementService.moveCharacter(character, targetX, targetY);

    // Get new visible area
    const mapArea = await movementService.getVisibleArea(
      updatedCharacter.location.x,
      updatedCharacter.location.y,
      'standard'
    );

    // Return updated character and map area
    res.json({
      message: 'Character moved successfully',
      character: {
        id: updatedCharacter._id,
        name: updatedCharacter.name,
        type: updatedCharacter.type,
        location: updatedCharacter.location,
        health: updatedCharacter.health,
        actions: updatedCharacter.actions
      },
      mapArea
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Enter a building
 */
exports.enterBuilding = async (req, res, next) => {
  try {
    const { characterId } = req.params;

    // Get character
    const character = await Character.findOne({
      _id: characterId,
      user: req.user.userId
    });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Check AP (costs 1 AP to enter a building)
    if (character.actions.availableActions < 1) {
      return res.status(400).json({ message: 'Not enough action points' });
    }

    // Check if character can enter building
    const canEnter = await movementService.canEnterBuilding(character);
    if (!canEnter.valid) {
      return res.status(400).json({ message: canEnter.reason });
    }

    // Enter the building
    const updatedCharacter = await movementService.enterBuilding(character);

    // Deduct AP
    updatedCharacter.actions.availableActions -= actionCosts.getBaseCost('ENTER_BUILDING');
    updatedCharacter.actions.lastActionTime = new Date();
    await updatedCharacter.save();

    // Get updated map area
    const mapArea = await movementService.getVisibleArea(
      updatedCharacter.location.x,
      updatedCharacter.location.y,
      'standard'
    );

    // Return updated character and map area
    res.json({
      message: 'Entered building',
      character: {
        id: updatedCharacter._id,
        name: updatedCharacter.name,
        type: updatedCharacter.type,
        location: updatedCharacter.location,
        health: updatedCharacter.health,
        actions: updatedCharacter.actions
      },
      mapArea
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Exit a building
 */
exports.exitBuilding = async (req, res, next) => {
  try {
    const { characterId } = req.params;

    // Get character
    const character = await Character.findOne({
      _id: characterId,
      user: req.user.userId
    });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Check AP (costs 1 AP to exit a building)
    if (character.actions.availableActions < 1) {
      return res.status(400).json({ message: 'Not enough action points' });
    }

    // Check if character can exit building
    const canExit = await movementService.canExitBuilding(character);
    if (!canExit.valid) {
      return res.status(400).json({ message: canExit.reason });
    }

    // Exit the building
    const updatedCharacter = await movementService.exitBuilding(character);

    // Deduct AP
    updatedCharacter.actions.availableActions -= actionCosts.getBaseCost('EXIT_BUILDING');
    updatedCharacter.actions.lastActionTime = new Date();
    await updatedCharacter.save();

    // Get updated map area
    const mapArea = await movementService.getVisibleArea(
      updatedCharacter.location.x,
      updatedCharacter.location.y,
      'standard'
    );

    // Return updated character and map area
    res.json({
      message: 'Exited building',
      character: {
        id: updatedCharacter._id,
        name: updatedCharacter.name,
        type: updatedCharacter.type,
        location: updatedCharacter.location,
        health: updatedCharacter.health,
        actions: updatedCharacter.actions
      },
      mapArea
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get building details
 */
exports.getBuilding = async (req, res, next) => {
  try {
    const { buildingId } = req.params;

    // Get building
    const building = await Building.findById(buildingId).populate('location.suburb');

    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Get characters in the building
    const charactersInBuilding = await Character.find({
      'location.buildingId': buildingId
    }).populate('user', 'username');

    // Return building details
    res.json({
      building: {
        id: building._id,
        name: building.name,
        type: building.type,
        state: building.state,
        isPowered: building.isPowered,
        barricadeLevel: building.barricadeLevel,
        barricadeStatus: building.barricadeStatus,
        doorsOpen: building.doorsOpen,
        location: building.location,
        properties: building.properties
      },
      characters: charactersInBuilding.map(c => ({
        id: c._id,
        name: c.name,
        type: c.type,
        health: c.health
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Interact with a building
 */
exports.interactWithBuilding = async (req, res, next) => {
  try {
    const { characterId, buildingId } = req.params;
    const { action } = req.body;

    // Validate input
    if (!action) {
      return res.status(400).json({ message: 'Action is required' });
    }

    // Get character
    const character = await Character.findOne({
      _id: characterId,
      user: req.user.userId
    });

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Get building
    const building = await Building.findById(buildingId);

    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Check if character is at the building
    if (
      character.location.x !== building.location.x ||
      character.location.y !== building.location.y ||
      character.location.buildingId?.toString() !== buildingId
    ) {
      return res.status(400).json({ message: 'Character is not at this building' });
    }

    let result;

    // Handle different actions
    switch (action) {
      case 'openDoors':
        // Validate: Only survivors or zombies with Memories of Life can open doors
        if (character.type === 'zombie') {
          const hasMemoriesOfLife = character.skills.some(skill =>
            skill.name === 'Memories of Life' && skill.active
          );

          if (!hasMemoriesOfLife) {
            return res.status(400).json({
              message: 'Zombies need Memories of Life to open doors'
            });
          }
        }

        // Check AP
        if (character.actions.availableActions < 1) {
          return res.status(400).json({ message: 'Not enough action points' });
        }

        // Open doors
        building.doorsOpen = true;
        await building.save();

        // Deduct AP
        character.actions.availableActions -= actionCosts.getBaseCost('OPEN_DOOR');
        character.actions.lastActionTime = new Date();
        await character.save();

        result = { message: 'Doors opened', doorsOpen: true };
        break;

      case 'closeDoors':
        // Validate: Only survivors or zombies with Memories of Life can close doors
        if (character.type === 'zombie') {
          const hasMemoriesOfLife = character.skills.some(skill =>
            skill.name === 'Memories of Life' && skill.active
          );

          if (!hasMemoriesOfLife) {
            return res.status(400).json({
              message: 'Zombies need Memories of Life to close doors'
            });
          }
        }

        // Check AP
        if (character.actions.availableActions < 1) {
          return res.status(400).json({ message: 'Not enough action points' });
        }

        // Close doors
        building.doorsOpen = false;
        await building.save();

        // Deduct AP
        character.actions.availableActions -= actionCosts.getBaseCost('CLOSE_DOOR');
        character.actions.lastActionTime = new Date();
        await character.save();

        result = { message: 'Doors closed', doorsOpen: false };
        break;

      case 'barricade':
        // Validate: Only survivors can barricade
        if (character.type === 'zombie') {
          return res.status(400).json({ message: 'Zombies cannot barricade buildings' });
        }

        // Validate: Need Construction skill
        const hasConstruction = character.skills.some(skill =>
          skill.name === 'Construction' && skill.active
        );

        if (!hasConstruction) {
          return res.status(400).json({
            message: 'Construction skill required to barricade'
          });
        }

        // Check AP
        if (character.actions.availableActions < 1) {
          return res.status(400).json({ message: 'Not enough action points' });
        }

        // Add barricade
        await building.addBarricade(10);

        // Deduct AP
        character.actions.availableActions -= actionCosts.getBaseCost('BARRICADE');
        character.actions.lastActionTime = new Date();
        await character.save();

        result = {
          message: 'Barricade strengthened',
          barricadeLevel: building.barricadeLevel,
          barricadeStatus: building.barricadeStatus
        };
        break;

      case 'attackBarricade':
        // Validate: Only zombies can attack barricades
        if (character.type === 'survivor') {
          return res.status(400).json({ message: 'Survivors cannot attack barricades' });
        }

        // Check if there's a barricade
        if (building.barricadeLevel === 0) {
          return res.status(400).json({ message: 'No barricade to attack' });
        }

        // Check AP
        if (character.actions.availableActions < 1) {
          return res.status(400).json({ message: 'Not enough action points' });
        }

        // Attack barricade (reduce by 5-10 points)
        const damageAmount = 5 + Math.floor(Math.random() * 6);
        await building.reduceBarricade(damageAmount);

        // Deduct AP
        character.actions.availableActions -= actionCosts.getBaseCost('ATTACK_BARRICADE');
        character.actions.lastActionTime = new Date();

        // Grant XP (for attacking barricades)
        character.experience += 1;
        await character.save();

        result = {
          message: `Barricade damaged (${damageAmount} points)`,
          barricadeLevel: building.barricadeLevel,
          barricadeStatus: building.barricadeStatus
        };
        break;

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    // Return result
    res.json({
      result,
      character: {
        id: character._id,
        name: character.name,
        type: character.type,
        actions: character.actions,
        experience: character.experience
      },
      building: {
        id: building._id,
        name: building.name,
        barricadeLevel: building.barricadeLevel,
        barricadeStatus: building.barricadeStatus,
        doorsOpen: building.doorsOpen
      }
    });
  } catch (error) {
    next(error);
  }
};

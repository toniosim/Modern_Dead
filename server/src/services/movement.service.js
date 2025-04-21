const MapCell = require('../models/map.model');
const Building = require('../models/building.model');
const Character = require('../models/character.model');
const Suburb = require('../models/suburb.model');
const { populateQuery } = require('../utils/population.util');

class MovementService {
  /**
   * Get a single map cell by coordinates
   * @param {Number} x - X coordinate
   * @param {Number} y - Y coordinate
   * @param {String} populationLevel - Level of population ('basic', 'standard', 'full')
   * @returns {Promise<Object>} The map cell
   */
  async getCell(x, y, populationLevel = 'standard') {
    // Ensure coordinates are within bounds
    if (x < 0 || x >= 100 || y < 0 || y >= 100) {
      return null;
    }

    const query = MapCell.findOne({ x, y });
    return populateQuery(query, 'mapCell', populationLevel);
  }

  /**
   * Get adjacent cells to a position (N, E, S, W)
   * @param {Number} x - X coordinate
   * @param {Number} y - Y coordinate
   * @param {String} populationLevel - Level of population ('basic', 'standard', 'full')
   * @returns {Promise<Array>} Array of adjacent cells
   */
  async getAdjacentCells(x, y, populationLevel = 'standard') {
    const adjacentPositions = [
      { x: x, y: y - 1 }, // North
      { x: x + 1, y: y }, // East
      { x: x, y: y + 1 }, // South
      { x: x - 1, y: y }  // West
    ];

    const cells = [];

    for (const pos of adjacentPositions) {
      if (pos.x >= 0 && pos.x < 100 && pos.y >= 0 && pos.y < 100) {
        const cell = await this.getCell(pos.x, pos.y, populationLevel);
        cells.push(cell);
      } else {
        cells.push(null); // Out of bounds
      }
    }

    return cells;
  }

  /**
   * Get visible area (3x3 grid centered on position)
   * @param {Number} x - X coordinate
   * @param {Number} y - Y coordinate
   * @param {String} populationLevel - Level of population ('basic', 'standard', 'full')
   * @returns {Promise<Object>} 3x3 grid and current cell
   */
  async getVisibleArea(x, y, populationLevel = 'standard') {
    // Ensure coordinates are within bounds
    if (x < 0 || x >= 100 || y < 0 || y >= 100) {
      throw new Error('Coordinates out of bounds');
    }

    const grid = [];
    const currentCell = await this.getCell(x, y, populationLevel);

    // Find suburb for current location
    let suburb = null;
    if (currentCell && currentCell.suburb) {
      suburb = await Suburb.findById(currentCell.suburb);
    }

    // Calculate grid boundaries (handle edge cases)
    const minX = Math.max(0, x - 1);
    const maxX = Math.min(99, x + 1);
    const minY = Math.max(0, y - 1);
    const maxY = Math.min(99, y + 1);

    // Query all cells in the visible area
    const cells = await MapCell.find({
      x: { $gte: minX, $lte: maxX },
      y: { $gte: minY, $lte: maxY }
    }).populate('building').populate('suburb');

    // Convert to a 2D grid
    for (let gridY = minY; gridY <= maxY; gridY++) {
      const row = [];
      for (let gridX = minX; gridX <= maxX; gridX++) {
        const cell = cells.find(c => c.x === gridX && c.y === gridY);
        row.push(cell || null);
      }
      grid.push(row);
    }

    return {
      grid,
      currentCell,
      suburb,
      boundingBox: { minX, maxX, minY, maxY }
    };
  }

  /**
   * Check if a move is valid
   * @param {Object} character - Character document
   * @param {Number} targetX - Target X coordinate
   * @param {Number} targetY - Target Y coordinate
   * @returns {Promise<Object>} Validation result with AP cost
   */
  async isValidMove(character, targetX, targetY) {
    // Get current location
    const { x: currentX, y: currentY } = character.location;

    // Validate target coordinates
    if (targetX < 0 || targetX >= 100 || targetY < 0 || targetY >= 100) {
      return {
        valid: false,
        apCost: 0,
        reason: 'Target location is out of bounds'
      };
    }

    // Check if target is adjacent (or same as current)
    const isAdjacent = (
      (Math.abs(targetX - currentX) === 1 && targetY === currentY) ||
      (Math.abs(targetY - currentY) === 1 && targetX === currentX)
    );

    if (!isAdjacent) {
      // Check if character has Free Running skill and both cells are buildings
      const hasFreeFunning = character.skills.some(skill =>
        skill.name === 'Free Running' && skill.active
      );

      if (hasFreeFunning) {
        // Get current and target cells
        const currentCell = await this.getCell(currentX, currentY);
        const targetCell = await this.getCell(targetX, targetY);

        // Check if both are buildings and are diagonally adjacent
        const areBothBuildings =
          currentCell?.type === 'building' &&
          targetCell?.type === 'building';

        const areDiagonallyAdjacent =
          Math.abs(targetX - currentX) === 1 &&
          Math.abs(targetY - currentY) === 1;

        if (!(areBothBuildings && areDiagonallyAdjacent)) {
          return {
            valid: false,
            apCost: 0,
            reason: 'Cannot move to non-adjacent location without Free Running between adjacent buildings'
          };
        }
      } else {
        return {
          valid: false,
          apCost: 0,
          reason: 'Target location is not adjacent'
        };
      }
    }

    // Get target cell
    const targetCell = await this.getCell(targetX, targetY, 'standard');
    if (!targetCell) {
      return {
        valid: false,
        apCost: 0,
        reason: 'Target location does not exist'
      };
    }

    // If target is a building, check if it's accessible
    if (targetCell.type === 'building' && targetCell.building) {
      const building = await Building.findById(targetCell.building);

      if (building) {
        // Check barricade level
        if (building.barricadeLevel >= 60) { // "Heavily barricaded" or higher
          // Survivors need Free Running to enter
          if (character.type === 'survivor') {
            const hasFreeFunning = character.skills.some(skill =>
              skill.name === 'Free Running' && skill.active
            );

            if (!hasFreeFunning) {
              return {
                valid: false,
                apCost: 0,
                reason: 'Building is too heavily barricaded to enter without Free Running'
              };
            }
          } else {
            // Zombies cannot enter heavily barricaded buildings
            return {
              valid: false,
              apCost: 0,
              reason: 'Building is too heavily barricaded for zombies to enter'
            };
          }
        } else if (building.barricadeLevel > 0) {
          // Any barricade blocks zombies
          if (character.type === 'zombie') {
            return {
              valid: false,
              apCost: 0,
              reason: 'Building is barricaded and cannot be entered by zombies'
            };
          }
        } else if (!building.doorsOpen) {
          // Closed doors block zombies without Memories of Life
          if (character.type === 'zombie') {
            const hasMemoriesOfLife = character.skills.some(skill =>
              skill.name === 'Memories of Life' && skill.active
            );

            if (!hasMemoriesOfLife) {
              return {
                valid: false,
                apCost: 0,
                reason: 'Doors are closed and cannot be opened without Memories of Life'
              };
            }
          }
        }
      }
    }

    // Calculate AP cost
    let apCost = 1; // Standard cost is 1 AP

    // Zombies without Lurching Gait move at half speed
    if (character.type === 'zombie') {
      const hasLurchingGait = character.skills.some(skill =>
        skill.name === 'Lurching Gait' && skill.active
      );

      if (!hasLurchingGait) {
        apCost = 2; // Double cost for zombies without Lurching Gait
      }
    }

    // Check if character has enough AP
    if (character.actions.availableActions < apCost) {
      return {
        valid: false,
        apCost,
        reason: 'Not enough action points'
      };
    }

    return { valid: true, apCost };
  }

  /**
   * Move character to new location
   * @param {Object} character - Character document
   * @param {Number} targetX - Target X coordinate
   * @param {Number} targetY - Target Y coordinate
   * @returns {Promise<Object>} Updated character
   */
  async moveCharacter(character, targetX, targetY) {
    // Validate move
    const validationResult = await this.isValidMove(character, targetX, targetY);

    if (!validationResult.valid) {
      throw new Error(validationResult.reason);
    }

    // Get target cell
    const targetCell = await this.getCell(targetX, targetY, 'standard');

    // Update character location
    character.location.x = targetX;
    character.location.y = targetY;

    // Update building reference if applicable
    if (targetCell.type === 'building' && targetCell.building) {
      character.location.buildingId = targetCell.building;
    } else {
      character.location.buildingId = null;
    }

    // Update area name
    if (targetCell.suburb) {
      let areaName = targetCell.suburb.name;

      // Add building name if inside a building
      if (targetCell.type === 'building' && targetCell.building) {
        const building = await Building.findById(targetCell.building);
        if (building) {
          areaName += ` - ${building.name}`;
        }
      } else {
        areaName += ' - Street';
      }

      character.location.areaName = areaName;
    }

    // Deduct AP
    character.actions.availableActions -= validationResult.apCost;
    character.actions.lastActionTime = new Date();

    // Save and return updated character
    await character.save();

    return character;
  }

  /**
   * Get characters in a location
   * @param {Number} x - X coordinate
   * @param {Number} y - Y coordinate
   * @param {Boolean} includeBuilding - Whether to include characters in the building
   * @returns {Promise<Array>} Characters at the location
   */
  async getCharactersAtLocation(x, y, includeBuilding = false) {
    let query = {
      'location.x': x,
      'location.y': y
    };

    if (!includeBuilding) {
      // Only get characters on the street
      query['location.buildingId'] = null;
    }

    return Character.find(query).populate('user', 'username');
  }
}

module.exports = new MovementService();

// server/src/services/ap.service.js
const Character = require('../models/character.model');
const Building = require('../models/building.model');

/**
 * Action Points (AP) service
 * Handles calculations and operations related to character action points
 */
class ApService {
  /**
   * Calculate current available AP for a character based on time elapsed
   * @param {Object} character - Character document
   * @param {Boolean} saveChanges - Whether to save changes to the database
   * @returns {Promise<Number>} - Current available AP
   */
  async calculateAvailableAp(character, saveChanges = false) {
    if (!character || !character.actions) {
      throw new Error('Invalid character data');
    }

    // If already at max, no calculation needed
    if (character.actions.availableActions >= character.actions.maxActions) {
      return character.actions.availableActions;
    }

    const now = new Date();
    const lastUpdate = character.actions.lastActionTime || now;
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

    // Skip if last update was less than 1 minute ago (to avoid excessive calculations)
    if (hoursSinceUpdate < 0.016 && character.actions.availableActions > 0) {
      return character.actions.availableActions;
    }

    // Get total regeneration rate including bonuses
    const totalRate = await this.getRegenerationRate(character);

    // Calculate regenerated AP
    let regeneratedAp = Math.floor(hoursSinceUpdate * totalRate);

    // Calculate new AP value, capped at max
    const newAp = Math.min(
      character.actions.maxActions,
      character.actions.availableActions + regeneratedAp
    );

    // Save changes if requested
    if (saveChanges && newAp > character.actions.availableActions) {
      character.actions.availableActions = newAp;
      character.actions.lastActionTime = now;
      await character.save();
    }

    return newAp;
  }

  /**
   * Consume AP for an action
   * @param {Object} character - Character document
   * @param {Number} amount - Amount of AP to consume
   * @returns {Promise<Object>} - Result of operation
   */
  async consumeAp(character, amount) {
    if (!character || !character.actions) {
      throw new Error('Invalid character data');
    }

    // First update the current AP
    const currentAp = await this.calculateAvailableAp(character, true);

    // Check if enough AP is available
    if (currentAp < amount) {
      return {
        success: false,
        message: 'Insufficient action points',
        required: amount,
        available: currentAp
      };
    }

    // Consume AP
    character.actions.availableActions -= amount;
    character.actions.lastActionTime = new Date();

    // Track when AP was fully consumed
    if (character.actions.availableActions === 0) {
      character.actions.lastEmptyTime = new Date();
    }

    // Update if character was resting
    if (character.actions.isResting) {
      character.actions.isResting = false;
    }

    // Save changes
    await character.save();

    return {
      success: true,
      consumed: amount,
      remaining: character.actions.availableActions
    };
  }

  /**
   * Calculate regeneration rate for a character
   * @param {Object} character - Character document
   * @param {Object} building - Optional building document (if character is in a building)
   * @returns {Promise<Number>} - AP regeneration rate per hour
   */
  async getRegenerationRate(character, building = null) {
    if (!character || !character.actions) {
      throw new Error('Invalid character data');
    }

    // Base regeneration rate
    let rate = character.actions.regenerationRate;

    // Add bonus regeneration from character effects
    rate += character.actions.bonusRegeneration || 0;

    // Check for special skills that affect AP regeneration
    const hasScoutSafehouse = character.skills.some(
      skill => skill.name === 'Scout Safehouse' && skill.active
    );

    if (hasScoutSafehouse && building) {
      rate += 0.5; // +0.5 AP/hour for Scout Safehouse skill in buildings
    }

    // Apply zombie movement penalty if applicable
    if (character.type === 'zombie') {
      const hasLurchingGait = character.skills.some(
        skill => skill.name === 'Lurching Gait' && skill.active
      );

      if (!hasLurchingGait) {
        rate *= 0.5; // 50% penalty for zombies without Lurching Gait
      }
    }

    // Apply building bonuses if provided
    if (building) {
      const buildingBonus = await this.getBuildingBonus(character, building);
      rate += buildingBonus;
    }
    // If not in a building but has recoveryLocationId, look up that building
    else if (character.actions.recoveryLocationId) {
      try {
        const recoveryBuilding = await Building.findById(character.actions.recoveryLocationId);
        if (recoveryBuilding) {
          const buildingBonus = await this.getBuildingBonus(character, recoveryBuilding);
          rate += buildingBonus;
        }
      } catch (error) {
        console.error('Error fetching recovery building:', error);
      }
    }

    // Apply resting bonus
    if (character.actions.isResting) {
      rate *= 1.5; // 50% bonus for actively resting
    }

    // Apply infection penalty
    if (character.infected) {
      rate *= 0.75; // 25% penalty when infected
    }

    // Ensure minimum rate of 0.5 AP/hour
    return Math.max(0.5, rate);
  }

  /**
   * Get building AP regeneration bonus for a character
   * @param {Object} character - Character document
   * @param {Object} building - Building document
   * @returns {Number} - Building AP bonus
   */
  async getBuildingBonus(character, building) {
    if (!building || !building.apRegeneration) {
      return 0;
    }

    let bonus = 0;

    // Base bonus depends on powered status
    bonus += building.isPowered ?
      building.apRegeneration.bonus :
      building.apRegeneration.bonus * 0.5;

    // Apply class-specific bonuses
    if (character.classGroup && building.apRegeneration.classBonuses) {
      const classGroup = character.classGroup.toLowerCase();
      bonus += building.apRegeneration.classBonuses[classGroup] || 0;
    }

    return bonus;
  }

  /**
   * Start resting at a location
   * @param {Object} character - Character document
   * @param {String} buildingId - Building ID
   * @returns {Promise<Object>} - Result of operation
   */
  async startResting(character, buildingId) {
    try {
      const building = await Building.findById(buildingId);

      if (!building) {
        return {
          success: false,
          message: 'Building not found'
        };
      }

      // Check if building can accept more resting characters
      if (!building.canAcceptResting()) {
        return {
          success: false,
          message: 'This location is at capacity'
        };
      }

      // Update character
      character.actions.isResting = true;
      character.actions.recoveryLocationId = buildingId;
      await character.save();

      // Update building
      await building.addRestingCharacter();

      return {
        success: true,
        message: 'Now resting at ' + building.name,
        rate: await this.getRegenerationRate(character, building)
      };
    } catch (error) {
      console.error('Error starting rest:', error);
      return {
        success: false,
        message: 'Failed to start resting'
      };
    }
  }

  /**
   * Stop resting
   * @param {Object} character - Character document
   * @returns {Promise<Object>} - Result of operation
   */
  async stopResting(character) {
    try {
      // If character was resting in a building, update building count
      if (character.actions.recoveryLocationId) {
        const building = await Building.findById(character.actions.recoveryLocationId);
        if (building) {
          await building.removeRestingCharacter();
        }
      }

      // Update character
      character.actions.isResting = false;
      character.actions.recoveryLocationId = null;
      await character.save();

      return {
        success: true,
        message: 'Stopped resting'
      };
    } catch (error) {
      console.error('Error stopping rest:', error);
      return {
        success: false,
        message: 'Failed to stop resting'
      };
    }
  }

  /**
   * Get time until next AP point
   * @param {Object} character - Character document
   * @returns {Promise<Object>} - Time information
   */
  async getTimeUntilNextAp(character) {
    if (character.actions.availableActions >= character.actions.maxActions) {
      return {
        atMaximum: true,
        secondsUntilNext: 0,
        minutesUntilNext: 0,
        nextApAt: new Date()
      };
    }

    const regenerationRate = await this.getRegenerationRate(character);
    const hoursTillNext = 1 / regenerationRate;
    const secondsTillNext = Math.floor(hoursTillNext * 3600);
    const minutesTillNext = Math.floor(hoursTillNext * 60);

    const now = new Date();
    const nextApAt = new Date(now.getTime() + (secondsTillNext * 1000));

    return {
      atMaximum: false,
      secondsUntilNext: secondsTillNext,
      minutesUntilNext: minutesTillNext,
      nextApAt,
      rate: regenerationRate
    };
  }
}

module.exports = new ApService();

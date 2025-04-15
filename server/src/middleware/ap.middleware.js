// server/src/middleware/ap.middleware.js
const Character = require('../models/character.model');
const apService = require('../services/ap.service');
const actionCosts = require('../config/action-costs.config');

/**
 * Middleware to update and validate action points
 * This should be applied to routes that require AP consumption
 */

/**
 * Update the character's current AP based on time elapsed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.updateAP = async (req, res, next) => {
  try {
    // Skip this middleware if no user is authenticated
    if (!req.user || !req.user.userId) {
      return next();
    }

    // Get character ID, either from request params/body or user's active character
    const characterId = req.params.characterId || req.body.characterId;

    if (!characterId) {
      return next();
    }

    // Find the character
    const character = await Character.findOne({
      _id: characterId,
      user: req.user.userId
    });

    if (!character) {
      return next();
    }

    // Update AP based on time elapsed
    await apService.calculateAvailableAp(character, true);

    // Attach character to request for use in downstream middleware
    req.character = character;

    next();
  } catch (error) {
    console.error('Error updating AP:', error);
    next(error);
  }
};

/**
 * Validate if character has enough AP for requested action
 * @param {String|Function} actionType - Action type or function to determine action type
 * @param {Object} options - Additional options
 * @returns {Function} Express middleware
 */
exports.validateAP = (actionType, options = {}) => {
  return async (req, res, next) => {
    try {
      // Skip validation if no character is attached
      if (!req.character) {
        return next();
      }

      // Determine action type - can be string or function that returns string
      const resolvedActionType = typeof actionType === 'function'
        ? actionType(req)
        : actionType;

      // Get base AP cost for this action
      let apCost = actionCosts.getBaseCost(resolvedActionType);

      // Apply any modifiers
      if (options.costModifier) {
        apCost = options.costModifier(apCost, req.character, req);
      }

      // Set minimum cost
      apCost = Math.max(apCost, options.minimumCost || 1);

      // Store cost in request for later use
      req.apCost = apCost;

      // Skip validation if dryRun option is set
      if (options.dryRun) {
        return next();
      }

      // Check if enough AP is available
      if (req.character.actions.availableActions < apCost) {
        return res.status(403).json({
          success: false,
          error: 'insufficient_ap',
          message: `Insufficient action points. You need ${apCost} AP but have ${req.character.actions.availableActions} AP.`,
          required: apCost,
          available: req.character.actions.availableActions,
          nextApIn: await apService.getTimeUntilNextAp(req.character)
        });
      }

      next();
    } catch (error) {
      console.error('Error validating AP:', error);
      next(error);
    }
  };
};

/**
 * Consume AP after successful action
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.consumeAP = async (req, res, next) => {
  try {
    // Skip if no character or apCost
    if (!req.character || !req.apCost) {
      return next();
    }

    // Consume AP
    const result = await apService.consumeAp(req.character, req.apCost);

    // Attach result to response locals for inclusion in response
    res.locals.apResult = {
      apConsumed: req.apCost,
      apRemaining: result.remaining,
      nextApIn: await apService.getTimeUntilNextAp(req.character)
    };

    next();
  } catch (error) {
    console.error('Error consuming AP:', error);
    next(error);
  }
};

/**
 * Check AP availability without consuming (for client-side validation)
 */
exports.checkAP = async (req, res) => {
  try {
    // Get character ID from request
    const characterId = req.params.characterId || req.query.characterId;

    if (!characterId) {
      return res.status(400).json({
        success: false,
        error: 'missing_character_id',
        message: 'Character ID is required'
      });
    }

    // Find character
    const character = await Character.findOne({
      _id: characterId,
      user: req.user.userId
    });

    if (!character) {
      return res.status(404).json({
        success: false,
        error: 'character_not_found',
        message: 'Character not found'
      });
    }

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
        regenerationRate: nextApInfo.rate,
        nextApIn: nextApInfo
      }
    });
  } catch (error) {
    console.error('Error checking AP:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Failed to check action points'
    });
  }
};

/**
 * Helper for rest action
 */
exports.handleResting = async (req, res) => {
  try {
    const { characterId, buildingId, action } = req.body;

    if (!characterId) {
      return res.status(400).json({
        success: false,
        message: 'Character ID is required'
      });
    }

    // Find character
    const character = await Character.findOne({
      _id: characterId,
      user: req.user.userId
    });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Character not found'
      });
    }

    let result;

    // Start or stop resting
    if (action === 'start' && buildingId) {
      result = await apService.startResting(character, buildingId);
    } else if (action === 'stop') {
      result = await apService.stopResting(character);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action or missing building ID'
      });
    }

    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error handling rest action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process rest action'
    });
  }
};

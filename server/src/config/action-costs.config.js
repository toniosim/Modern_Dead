// server/src/config/action-costs.config.js
/**
 * Action costs configuration
 * Defines AP costs for all actions in the game
 */

// Base costs for different action types
const BASE_COSTS = {
  // Movement
  MOVE: 0,
  ENTER_BUILDING: 0,
  EXIT_BUILDING: 0,

  // Combat
  ATTACK: 1,
  BITE_ATTACK: 1,
  MELEE_ATTACK: 1,
  FIREARM_ATTACK: 1,

  // Building interaction
  SEARCH: 1,
  BARRICADE: 1,
  REPAIR: 1,
  DESTROY_BARRICADE: 1,
  RANSACK: 1,

  // Items and healing
  USE_ITEM: 1,
  HEAL: 1,
  REVIVE: 2,
  EXTRACT_DNA: 1,

  // Communication
  RADIO_BROADCAST: 0,
  SPRAY_GRAFFITI: 1,
  SPEAK: 0,

  // Special actions
  REST: 1,
  LEARN_SKILL: 0,
  STAND: 3,
};

/**
 * Get base AP cost for an action
 * @param {String} actionType - Type of action
 * @returns {Number} - Base AP cost
 */
exports.getBaseCost = (actionType) => {
  if (BASE_COSTS[actionType] !== undefined) {
    return BASE_COSTS[actionType];
  }

  // Default cost for unknown actions
  console.warn(`No defined AP cost for action type: ${actionType}`);
  return 1;
};

/**
 * Apply modifiers to action cost based on character skills, status, etc.
 * @param {Number} baseCost - Base cost of the action
 * @param {Object} character - Character performing the action
 * @param {String} actionType - Type of action
 * @returns {Number} - Modified cost
 */
exports.getModifiedCost = (baseCost, character, actionType) => {
  if (!character) return baseCost;

  let modifiedCost = baseCost;

  // Zombie movement penalty
  if (actionType === 'MOVE' && character.type === 'zombie') {
    const hasLurchingGait = character.skills.some(s =>
      s.name === 'Lurching Gait' && s.active
    );

    if (!hasLurchingGait) {
      modifiedCost = 2; // Double AP cost for zombie movement
    }
  }

  // Skill-based discounts
  const activeSkills = character.skills.filter(s => s.active).map(s => s.name);

  // Examples of skill modifiers
  if (actionType === 'BARRICADE' && activeSkills.includes('Construction')) {
    modifiedCost -= 1; // Construction reduces barricade cost
  }

  if (['HEAL', 'REVIVE'].includes(actionType) && activeSkills.includes('Surgery')) {
    modifiedCost -= 1; // Surgery reduces healing costs
  }

  // Infection penalty
  if (character.infected) {
    modifiedCost = Math.ceil(modifiedCost * 1.25); // 25% penalty when infected
  }

  // Ensure minimum cost of 1
  return Math.max(1, modifiedCost);
};

// Export the base costs for other modules to use
exports.COSTS = BASE_COSTS;

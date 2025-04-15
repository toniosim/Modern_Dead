// src/services/actionValidation.service.ts
import { useCharacterStore } from 'src/stores/character-store';

interface ActionConfig {
  apCost: number;
  requiredSkills?: string[];
  requiredItems?: { itemId: string; quantity: number }[];
  requiresState?: 'survivor' | 'zombie';
  requiresLocation?: 'inside' | 'outside';
  requiredTargetType?: string;
}

/**
 * Service for handling action validation logic
 */
class ActionValidationService {
  // Action configuration map
  private actionConfig: Record<string, ActionConfig> = {
    MOVE: { apCost: 1 },
    ENTER_BUILDING: { apCost: 1 },
    EXIT_BUILDING: { apCost: 1 },

    ATTACK: { apCost: 3, requiresState: 'survivor' },
    BITE_ATTACK: { apCost: 3, requiresState: 'zombie' },
    MELEE_ATTACK: {
      apCost: 3,
      requiresState: 'survivor',
      requiredItems: [{ itemId: 'melee_weapon', quantity: 1 }]
    },
    FIREARM_ATTACK: {
      apCost: 3,
      requiresState: 'survivor',
      requiredItems: [
        { itemId: 'firearm', quantity: 1 },
        { itemId: 'ammo', quantity: 1 }
      ],
      requiredSkills: ['Basic Firearms Training']
    },

    SEARCH: { apCost: 5, requiresLocation: 'inside' },
    BARRICADE: {
      apCost: 3,
      requiresLocation: 'inside',
      requiresState: 'survivor',
      requiredSkills: ['Construction']
    },

    HEAL: {
      apCost: 3,
      requiresState: 'survivor',
      requiredItems: [{ itemId: 'first_aid_kit', quantity: 1 }],
      requiredSkills: ['First Aid']
    },

    REVIVE: {
      apCost: 10,
      requiresState: 'survivor',
      requiredItems: [{ itemId: 'syringe', quantity: 1 }],
      requiredSkills: ['Lab Experience'],
      requiredTargetType: 'zombie'
    }
  };

  /**
   * Get the AP cost for an action
   * @param actionType Action type
   * @returns AP cost
   */
  getApCost(actionType: string): number {
    return this.actionConfig[actionType]?.apCost || 1;
  }

  /**
   * Check if an action can be performed
   * @param actionType Action type
   * @param characterId Character ID (optional, uses active character if not provided)
   * @returns Validation result
   */
  async validateAction(actionType: string, characterId?: string): Promise<{
    valid: boolean;
    reason?: string;
    apCost: number;
  }> {
    const characterStore = useCharacterStore();
    const character = characterId
      ? await characterStore.getCharacter(characterId)
      : characterStore.getActiveCharacter;

    if (!character) {
      return { valid: false, reason: 'No active character', apCost: 0 };
    }

    // Get action config
    const config = this.actionConfig[actionType];
    if (!config) {
      return { valid: false, reason: 'Unknown action type', apCost: 0 };
    }

    // Check AP
    if (characterStore.currentAp < config.apCost) {
      return {
        valid: false,
        reason: `Insufficient AP (${characterStore.currentAp}/${config.apCost})`,
        apCost: config.apCost
      };
    }

    // Check character state
    if (config.requiresState && character.type !== config.requiresState) {
      return {
        valid: false,
        reason: `This action requires being a ${config.requiresState}`,
        apCost: config.apCost
      };
    }

    // Check skills
    if (config.requiredSkills && config.requiredSkills.length > 0) {
      const hasSkills = config.requiredSkills.every(skillName =>
        character.skills.some(s => s.name === skillName && s.active)
      );

      if (!hasSkills) {
        return {
          valid: false,
          reason: `Missing required skills: ${config.requiredSkills.join(', ')}`,
          apCost: config.apCost
        };
      }
    }

    // Check location (simplified, would need to be expanded)
    if (config.requiresLocation) {
      const isInside = character.location.buildingId !== null;
      if ((config.requiresLocation === 'inside' && !isInside) ||
        (config.requiresLocation === 'outside' && isInside)) {
        return {
          valid: false,
          reason: `Must be ${config.requiresLocation} to perform this action`,
          apCost: config.apCost
        };
      }
    }

    // All checks passed
    return { valid: true, apCost: config.apCost };
  }
}

export default new ActionValidationService();

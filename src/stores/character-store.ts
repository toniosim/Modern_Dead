// src/stores/character-store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from 'src/boot/axios';
export type ClassGroup = 'MILITARY' | 'CIVILIAN' | 'SCIENTIST' | 'ZOMBIE';

// Define character types
export interface CharacterClass {
  name: string;
  description: string;
  startingSkills: string[];
  startingEquipment: { item: string; quantity: number }[];
}

// Define AP-related types
export interface ApInfo {
  current: number;
  max: number;
  regenerationRate: number;
  nextApIn: {
    atMaximum: boolean;
    secondsUntilNext: number;
    minutesUntilNext: number;
    nextApAt: Date;
    rate: number;
  };
  lastUpdated?: Date;
}

export interface Character {
  _id: string;
  name: string;
  type: 'survivor' | 'zombie';
  classGroup: ClassGroup;
  subClass: string;
  level: number;
  experience: number;
  health: {
    current: number;
    max: number;
  };
  infected: boolean;
  location: {
    x: number;
    y: number;
    buildingId: string | null;
    areaName: string;
  };
  inventory: {
    item: string;
    quantity: number;
  }[];
  skills: {
    name: string;
    level: number;
    active: boolean;
  }[];
  actions: {
    availableActions: number;
    lastActionTime: string;
    regenerationRate: number;
    maxActions: number;
    bonusRegeneration: number;
    isResting: boolean;
  };
  xpCosts: {
    military: number;
    science: number;
    civilian: number;
    zombie: number;
  };
  lastActive: string;
  createdAt: string;
}

export interface CharacterCreationData {
  name: string;
  classGroup: string;
  subClass: string;
}

export interface CharacterCreationData {
  name: string;
  classGroup: string;
  subClass: string;
}

export const useCharacterStore = defineStore('character', () => {
  // State
  const characters = ref<Character[]>([]);
  const currentCharacter = ref<Character | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // AP-related state
  const apInfo = ref<ApInfo>({
    current: 0,
    max: 50,
    regenerationRate: 1,
    nextApIn: {
      atMaximum: false,
      secondsUntilNext: 0,
      minutesUntilNext: 0,
      nextApAt: new Date(),
      rate: 1
    },
    lastUpdated: new Date()
  });

  const classDefinitions = ref<Record<ClassGroup, Record<string, CharacterClass>>>({
    MILITARY: {
      PRIVATE: {
        name: 'Private',
        description: 'Combat-oriented class that starts well-equipped for combat with a pistol.',
        startingSkills: ['Basic Firearms Training'],
        startingEquipment: [
          { item: 'Pistol', quantity: 1 },
          { item: 'Pistol Clip', quantity: 1 },
          { item: 'Radio', quantity: 1 }
        ]
      },
      SCOUT: {
        name: 'Scout',
        description: 'Mobility-focused class with excellent survival capabilities.',
        startingSkills: ['Free Running'],
        startingEquipment: [
          { item: 'Flare Gun', quantity: 1 },
          { item: 'Binoculars', quantity: 1 }
        ]
      },
      MEDIC: {
        name: 'Medic',
        description: 'Support class that earns XP by healing other survivors.',
        startingSkills: ['First Aid'],
        startingEquipment: [
          { item: 'First Aid Kit', quantity: 2 }
        ]
      }
    },
    CIVILIAN: {
      FIREFIGHTER: {
        name: 'Firefighter',
        description: 'Excellent starting class for beginners with melee combat capability.',
        startingSkills: ['Axe Proficiency'],
        startingEquipment: [
          { item: 'Fire Axe', quantity: 1 },
          { item: 'Radio', quantity: 1 }
        ]
      },
      POLICE_OFFICER: {
        name: 'Police Officer',
        description: 'Well-equipped combat class with defensive capabilities.',
        startingSkills: ['Basic Firearms Training'],
        startingEquipment: [
          { item: 'Pistol', quantity: 1 },
          { item: 'Flak Jacket', quantity: 1 },
          { item: 'Radio', quantity: 1 }
        ]
      },
      CONSUMER: {
        name: 'Consumer',
        description: 'Versatile class with shopping skills, starts with a random melee weapon.',
        startingSkills: ['Shopping'],
        startingEquipment: [
          { item: 'Random Melee Weapon', quantity: 1 },
          { item: 'Mobile Phone', quantity: 1 }
        ]
      }
    },
    SCIENTIST: {
      NECROTECH_LAB_ASSISTANT: {
        name: 'NecroTech Lab Assistant',
        description: 'Can earn XP by "tagging" zombies with DNA extractors.',
        startingSkills: ['NecroTech Employment'],
        startingEquipment: [
          { item: 'DNA Extractor', quantity: 1 }
        ]
      },
      DOCTOR: {
        name: 'Doctor',
        description: 'Most effective healing class due to Diagnosis skill.',
        startingSkills: ['Diagnosis', 'First Aid'],
        startingEquipment: [
          { item: 'First Aid Kit', quantity: 1 }
        ]
      }
    },
    ZOMBIE: {
      CORPSE: {
        name: 'Corpse',
        description: 'Starts as a zombie with Vigour Mortis for more effective bite attacks.',
        startingSkills: ['Vigour Mortis'],
        startingEquipment: []
      }
    }
  });

  const apUpdateTimer = ref<number | null>(null);
  const isResting = ref(false);

  // Getters
  const hasCharacters = computed(() => characters.value.length > 0);
  const getCharactersByType = computed(() => (type: 'survivor' | 'zombie') =>
    characters.value.filter(char => char.type === type)
  );
  const getActiveCharacter = computed(() => currentCharacter.value);

  // AP-related computed properties
  const currentAp = computed(() => {
    if (!currentCharacter.value) return 0;

    // If we have AP info, use that, otherwise use character data
    if (apInfo.value && apInfo.value.current !== undefined) {
      return apInfo.value.current;
    }

    return currentCharacter.value.actions.availableActions;
  });

  const maxAp = computed(() => {
    if (!currentCharacter.value) return 50;

    // If we have AP info, use that, otherwise use character data
    if (apInfo.value && apInfo.value.max !== undefined) {
      return apInfo.value.max;
    }

    return currentCharacter.value.actions.maxActions || 50;
  });

  const apPercentage = computed(() => {
    if (maxAp.value === 0) return 0;
    return Math.min(100, Math.round((currentAp.value / maxAp.value) * 100));
  });

  const isApFull = computed(() => currentAp.value >= maxAp.value);

  const timeUntilNextAp = computed(() => {
    if (!apInfo.value || !apInfo.value.nextApIn) {
      return null;
    }

    return apInfo.value.nextApIn;
  });

  const canPerformAction = computed(() => (apCost: number) => {
    return currentAp.value >= apCost;
  });

  // Actions
  async function fetchUserCharacters() {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get('/characters');
      characters.value = response.data;
      return characters.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch characters';
      throw error.value;
    } finally {
      loading.value = false;
    }
  }

  async function createCharacter(characterData: CharacterCreationData) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post('/characters', characterData);
      const newCharacter = response.data;
      characters.value.push(newCharacter);
      return newCharacter;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create character';
      throw error.value;
    } finally {
      loading.value = false;
    }
  }

  async function getCharacter(characterId: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get(`/characters/${characterId}`);
      currentCharacter.value = response.data;
      return currentCharacter.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to get character';
      throw error.value;
    } finally {
      loading.value = false;
    }
  }

  async function updateCharacterState(characterId: string, newState: 'alive' | 'dead') {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.patch(`/characters/${characterId}/state`, { newState });

      // Update the character in the store
      const updatedCharacter = response.data;
      currentCharacter.value = updatedCharacter;

      // Update in the characters array
      const index = characters.value.findIndex(c => c._id === characterId);
      if (index !== -1) {
        characters.value[index] = updatedCharacter;
      }

      return updatedCharacter;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update character state';
      throw error.value;
    } finally {
      loading.value = false;
    }
  }

  async function addSkill(characterId: string, skillName: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post(`/characters/${characterId}/skills`, { skillName });

      // Update the character in the store
      const updatedCharacter = response.data;
      currentCharacter.value = updatedCharacter;

      // Update in the characters array
      const index = characters.value.findIndex(c => c._id === characterId);
      if (index !== -1) {
        characters.value[index] = updatedCharacter;
      }

      return updatedCharacter;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to add skill';
      throw error.value;
    } finally {
      loading.value = false;
    }
  }

  async function deleteCharacter(characterId: string) {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/characters/${characterId}`);

      // Remove from the characters array
      characters.value = characters.value.filter(c => c._id !== characterId);

      // Clear current character if it's the deleted one
      if (currentCharacter.value && currentCharacter.value._id === characterId) {
        currentCharacter.value = null;
      }

      return true;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete character';
      throw error.value;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch current AP information from the server
   */
  async function fetchApInfo() {
    if (!currentCharacter.value) return;

    loading.value = true;
    error.value = null;

    try {
      const response = await api.get(`/characters/${currentCharacter.value._id}/ap`);

      if (response.data && response.data.success) {
        apInfo.value = response.data.ap;
        apInfo.value.lastUpdated = new Date();

        // Start AP update timer
        startApUpdateTimer();
      }

      return apInfo.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch AP information';
      throw error.value;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Start timer to update AP display without server requests
   */
  function startApUpdateTimer() {
    // Clear existing timer if any
    if (apUpdateTimer.value) {
      window.clearInterval(apUpdateTimer.value);
      apUpdateTimer.value = null;
    }

    // Don't start timer if we're at max AP
    if (isApFull.value) {
      return;
    }

    // Update every second
    apUpdateTimer.value = window.setInterval(() => {
      updateApClientSide();
    }, 1000);
  }

  /**
   * Stop AP update timer
   */
  function stopApUpdateTimer() {
    if (apUpdateTimer.value) {
      window.clearInterval(apUpdateTimer.value);
      apUpdateTimer.value = null;
    }
  }

  /**
   * Update AP display on client side based on elapsed time
   * This avoids constant server requests
   */
  function updateApClientSide() {
    if (!apInfo.value || !apInfo.value.lastUpdated) {
      return;
    }

    // If we're at max AP, nothing to do
    if (currentAp.value >= maxAp.value) {
      apInfo.value.current = maxAp.value;
      apInfo.value.nextApIn.atMaximum = true;
      stopApUpdateTimer();
      return;
    }

    // Calculate elapsed time since last update
    const now = new Date();
    const elapsedMs = now.getTime() - apInfo.value.lastUpdated.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    // Calculate regenerated AP
    const regenerationRate = apInfo.value.regenerationRate || 1;
    const regeneratedAp = elapsedHours * regenerationRate;

    // Calculate new AP value
    const newAp = Math.min(
      maxAp.value,
      apInfo.value.current + regeneratedAp
    );

    // Update AP info
    apInfo.value.current = newAp;

    // Calculate time until next AP
    if (newAp < maxAp.value) {
      const pointsUntilMax = maxAp.value - newAp;
      const hoursUntilMax = pointsUntilMax / regenerationRate;

      const secondsUntilNext = Math.floor((1 / regenerationRate) * 3600);
      const nextApAt = new Date(now.getTime() + (secondsUntilNext * 1000));

      apInfo.value.nextApIn = {
        atMaximum: false,
        secondsUntilNext,
        minutesUntilNext: Math.floor(secondsUntilNext / 60),
        nextApAt,
        rate: regenerationRate
      };
    } else {
      apInfo.value.nextApIn.atMaximum = true;
    }
  }

  /**
   * Consumer AP for an action
   * @param apCost - AP cost of the action
   */
  function consumeAp(apCost: number) {
    if (!currentCharacter.value || !apInfo.value) {
      return false;
    }

    if (apInfo.value.current < apCost) {
      return false;
    }

    // Update AP info
    apInfo.value.current -= apCost;
    apInfo.value.lastUpdated = new Date();

    // Update next AP calculation
    if (apInfo.value.current < maxAp.value) {
      const regenerationRate = apInfo.value.regenerationRate || 1;
      const secondsUntilNext = Math.floor((1 / regenerationRate) * 3600);
      const nextApAt = new Date(new Date().getTime() + (secondsUntilNext * 1000));

      apInfo.value.nextApIn = {
        atMaximum: false,
        secondsUntilNext,
        minutesUntilNext: Math.floor(secondsUntilNext / 60),
        nextApAt,
        rate: regenerationRate
      };

      // Make sure timer is running
      startApUpdateTimer();
    }

    return true;
  }

  /**
   * Toggle resting state for faster AP regeneration
   */
  async function toggleResting(buildingId?: string) {
    if (!currentCharacter.value) {
      return { success: false, message: 'No active character' };
    }

    loading.value = true;
    error.value = null;

    try {
      const action = isResting.value ? 'stop' : 'start';

      const response = await api.post('/characters/rest', {
        characterId: currentCharacter.value._id,
        buildingId,
        action
      });

      if (response.data && response.data.success) {
        isResting.value = action === 'start';

        // Update AP info with new regeneration rate
        if (response.data.rate) {
          apInfo.value.regenerationRate = response.data.rate;

          // Recalculate time until next AP
          await fetchApInfo();
        }
      }

      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to toggle resting state';
      throw error.value;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Format time until next AP for display
   */
  function formatTimeUntilNextAp(): string {
    if (!timeUntilNextAp.value) {
      return 'Unknown';
    }

    if (timeUntilNextAp.value.atMaximum) {
      return 'Full';
    }

    if (timeUntilNextAp.value.minutesUntilNext > 0) {
      return `${timeUntilNextAp.value.minutesUntilNext}m ${timeUntilNextAp.value.secondsUntilNext % 60}s`;
    }

    return `${timeUntilNextAp.value.secondsUntilNext}s`;
  }

  // Clean up when store is no longer used
  function cleanUp() {
    stopApUpdateTimer();
  }

  // Extension to setActiveCharacter to fetch AP info
  async function setActiveCharacter(characterId: string) {
    const character = characters.value.find(c => c._id === characterId);

    if (character) {
      currentCharacter.value = character;

      // Fetch AP info for active character
      await fetchApInfo();

      return character;
    } else {
      const fetchedCharacter = await getCharacter(characterId);

      // Fetch AP info for active character
      await fetchApInfo();

      return fetchedCharacter;
    }
  }

  function updateApInfo(newApInfo: Partial<ApInfo>) {
    apInfo.value = {
      ...apInfo.value,
      ...newApInfo,
      lastUpdated: new Date()
    };

    // Start/stop AP update timer as needed
    if (newApInfo.current && newApInfo.max && newApInfo.current >= newApInfo.max) {
      stopApUpdateTimer();
    } else {
      startApUpdateTimer();
    }
  }

  return {
    // Existing state
    characters,
    currentCharacter,
    loading,
    error,
    classDefinitions,  // This was in the original store but not in the cutoff excerpt

    // AP-related state
    apInfo,
    isResting,

    // Existing getters
    hasCharacters,
    getCharactersByType,
    getActiveCharacter,

    // AP-related getters
    currentAp,
    maxAp,
    apPercentage,
    isApFull,
    timeUntilNextAp,
    canPerformAction,

    // Existing actions
    fetchUserCharacters,
    createCharacter,
    getCharacter,
    updateCharacterState,
    addSkill,
    deleteCharacter,

    // Modified with AP support
    setActiveCharacter,

    // New AP-related actions
    fetchApInfo,
    consumeAp,
    updateApInfo,
    toggleResting,
    formatTimeUntilNextAp,
    startApUpdateTimer,
    stopApUpdateTimer,
    cleanUp
  };
});

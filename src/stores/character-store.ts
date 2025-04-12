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

export const useCharacterStore = defineStore('character', () => {
  // State
  const characters = ref<Character[]>([]);
  const currentCharacter = ref<Character | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
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

  // Getters
  const hasCharacters = computed(() => characters.value.length > 0);
  const getCharactersByType = computed(() => (type: 'survivor' | 'zombie') =>
    characters.value.filter(char => char.type === type)
  );
  const getActiveCharacter = computed(() => currentCharacter.value);

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

  async function setActiveCharacter(characterId: string) {
    const character = characters.value.find(c => c._id === characterId);

    if (character) {
      currentCharacter.value = character;
      return character;
    } else {
      return getCharacter(characterId);
    }
  }

  return {
    // State
    characters,
    currentCharacter,
    loading,
    error,
    classDefinitions,

    // Getters
    hasCharacters,
    getCharactersByType,
    getActiveCharacter,

    // Actions
    fetchUserCharacters,
    createCharacter,
    getCharacter,
    updateCharacterState,
    addSkill,
    deleteCharacter,
    setActiveCharacter
  };
});

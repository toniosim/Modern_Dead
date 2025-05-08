// src/stores/map-store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from 'src/boot/axios';
import { useCharacterStore } from './character-store';

// Define map-related types
export interface MapCell {
  _id: string;
  x: number;
  y: number;
  type: 'street' | 'building';
  building?: Building | null;
  suburb?: string;
  isPassable: boolean;
  properties?: Record<string, any>;
  entities?: Array<any>;
}

export interface Building {
  _id: string;
  name: string;
  type: string;
  state: 'normal' | 'ransacked' | 'ruined';
  isPowered: boolean;
  barricadeLevel: number;
  barricadeStatus: string;
  doorsOpen: boolean;
  location: {
    x: number;
    y: number;
    suburb: string;
  };
  properties?: Record<string, any>;
}

export interface Suburb {
  _id: string;
  name: string;
  division: 'NW' | 'NE' | 'SW' | 'SE';
  district: number;
  dangerLevel: number;
}

export interface VisibleCharacter {
  id: string;
  name: string;
  type: 'survivor' | 'zombie';
  health: {
    current: number;
    max: number;
  };
  isCurrentCharacter: boolean;
}

export interface MapArea {
  grid: MapCell[][];
  currentCell: MapCell;
  suburb?: Suburb;
  boundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export const useMapStore = defineStore('map', () => {
  // State
  const mapArea = ref<MapArea | null>(null);
  const currentBuilding = ref<Building | null>(null);
  const visibleCharacters = ref<Record<string, VisibleCharacter[]>>({});
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Get character store for active character
  const characterStore = useCharacterStore();

  // Computed properties
  const currentCell = computed(() => mapArea.value?.currentCell || null);

  const currentSuburb = computed(() => mapArea.value?.suburb || null);

  const charactersAtCurrentLocation = computed(() => {
    if (!currentCell.value) return [];

    const key = `${currentCell.value.x},${currentCell.value.y}`;
    return visibleCharacters.value[key] || [];
  });

  // Helper to convert coordinates to key
  const coordsToKey = (x: number, y: number) => `${x},${y}`;

  // Actions
  /**
   * Load map area around character
   */
  async function loadMapArea(characterId: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get(`/map/area/${characterId}`);
      mapArea.value = response.data.mapArea;

      // Process visible characters
      visibleCharacters.value = {};

      if (response.data.visibleCharacters) {
        response.data.visibleCharacters.forEach((locationData: any) => {
          const key = coordsToKey(locationData.x, locationData.y);
          visibleCharacters.value[key] = locationData.characters;
        });
      }

      return mapArea.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to load map area';
      throw error.value;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Move character to a new location
   */
  async function moveCharacter(characterId: string, x: number, y: number) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post(`/map/move/${characterId}`, { x, y });

      // Update local data
      mapArea.value = response.data.mapArea;

      // Update character in character store
      if (response.data.character) {
        characterStore.updateCharacterData(response.data.character);
      }

      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to move character';
      throw error.value;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Enter a building
   */
  async function enterBuilding(characterId: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post(`/map/enter-building/${characterId}`);

      // Update local data
      mapArea.value = response.data.mapArea;

      // Update character in character store
      if (response.data.character) {
        characterStore.updateCharacterData(response.data.character);
      }

      // If we have a building, load building details
      if (response.data.character?.location?.buildingId) {
        await getBuilding(response.data.character.location.buildingId);
      }

      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to enter building';
      throw error.value;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Exit a building
   */
  async function exitBuilding(characterId: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post(`/map/exit-building/${characterId}`);

      // Update local data
      mapArea.value = response.data.mapArea;

      // Update character in character store
      if (response.data.character) {
        characterStore.updateCharacterData(response.data.character);
      }

      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to exit building';
      throw error.value;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get building details
   */
  async function getBuilding(buildingId: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get(`/map/building/${buildingId}`);
      currentBuilding.value = response.data.building;

      // Update visible characters for this building
      if (response.data.characters && currentBuilding.value) {
        const key = coordsToKey(
          currentBuilding.value.location.x,
          currentBuilding.value.location.y
        );

        visibleCharacters.value[key] = response.data.characters;
      }

      return currentBuilding.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to get building';
      throw error.value;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Interact with a building
   */
  async function interactWithBuilding(characterId: string, buildingId: string, action: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post(
        `/map/interact/${characterId}/${buildingId}`,
        { action }
      );

      // Update building data if we have a current building
      if (response.data.building && currentBuilding.value && currentBuilding.value._id === buildingId) {
        currentBuilding.value = {
          ...currentBuilding.value,
          ...response.data.building
        };
      }

      // Update character in character store
      if (response.data.character) {
        characterStore.updateCharacterData(response.data.character);
      }

      return response.data.result;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to interact with building';
      throw error.value;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Check if given coordinates are adjacent to the player's current location
   */
  function isAdjacentToCurrentLocation(x: number, y: number) {
    if (!mapArea.value || !mapArea.value.currentCell) return false;

    const currentX = mapArea.value.currentCell.x;
    const currentY = mapArea.value.currentCell.y;

    // Adjacent if difference in one coordinate is 1 and the other is 0
    return (
      (Math.abs(x - currentX) === 1 && y === currentY) ||
      (Math.abs(y - currentY) === 1 && x === currentX)
    );
  }

  /**
   * Get cell at coordinates
   */
  function getCellAt(x: number, y: number): MapCell | null {
    if (!mapArea.value?.grid || !mapArea.value?.boundingBox) return null;

    // Find the relative position in the grid
    const gridX = x - mapArea.value.boundingBox.minX;
    const gridY = y - mapArea.value.boundingBox.minY;

    // Check if coordinates are within grid bounds
    if (
      gridY < 0 ||
      gridY >= mapArea.value.grid.length ||
      gridX < 0 ||
      mapArea.value.grid[gridY] === undefined ||
      gridX >= mapArea.value.grid[gridY].length
    ) {
      return null;
    }

    return mapArea.value.grid[gridY][gridX] || null;
  }

  /**
   * Get characters at coordinates
   */
  function getCharactersAt(x: number, y: number): VisibleCharacter[] {
    const key = coordsToKey(x, y);
    return visibleCharacters.value[key] || [];
  }

  /**
   * Clear map data (e.g., on logout)
   */
  function clearMapData() {
    mapArea.value = null;
    currentBuilding.value = null;
    visibleCharacters.value = {};
    error.value = null;
  }

  return {
    // State
    mapArea,
    currentBuilding,
    visibleCharacters,
    loading,
    error,

    // Getters
    currentCell,
    currentSuburb,
    charactersAtCurrentLocation,

    // Actions
    loadMapArea,
    moveCharacter,
    getBuilding,
    interactWithBuilding,
    isAdjacentToCurrentLocation,
    getCellAt,
    getCharactersAt,
    enterBuilding,
    exitBuilding,
    clearMapData
  };
});

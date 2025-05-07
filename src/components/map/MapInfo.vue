<template>
  <div class="map-info">
    <q-card v-if="mapStore.currentCell" flat bordered>
      <q-card-section>
        <div class="text-subtitle1">Location Information</div>

        <!-- Coordinates -->
        <div class="location-coords q-mb-sm">
          <q-icon name="place" size="sm" class="q-mr-xs" />
          {{ formatCoordinates(mapStore.currentCell.x, mapStore.currentCell.y) }}
          <q-badge class="q-ml-sm">
            {{ mapStore.currentSuburb?.name || 'Unknown Area' }}
          </q-badge>
        </div>

        <!-- Building Info (if in a building) -->
        <div v-if="isInBuilding" class="building-info q-mb-sm">
          <div class="text-weight-bold q-mb-xs">
            <q-icon :name="getBuildingIcon(currentBuilding.type)" size="sm" class="q-mr-xs" />
            {{ currentBuilding.name }}
          </div>
          <div class="building-details text-caption">
            <div>Type: {{ formatBuildingType(currentBuilding.type) }}</div>
            <div>State: {{ formatBuildingState(currentBuilding.state) }}</div>
            <div>Power: {{ currentBuilding.isPowered ? 'Powered' : 'Unpowered' }}</div>
            <div>Barricades: {{ getBarricadeStatus(currentBuilding.barricadeLevel) }}</div>
            <div>Doors: {{ currentBuilding.doorsOpen ? 'Open' : 'Closed' }}</div>
          </div>
        </div>

        <!-- Street Info (if on a street) -->
        <div v-else class="street-info q-mb-sm">
          <div class="text-weight-bold q-mb-xs">
            <q-icon name="signpost" size="sm" class="q-mr-xs" />
            Street
          </div>
          <div class="street-details text-caption">
            <div>Adjacent Buildings: {{ adjacentBuildingCount }}</div>
          </div>
        </div>

        <!-- Characters Here -->
        <div v-if="charactersHere.length > 0" class="characters-here q-mt-md">
          <div class="text-weight-bold q-mb-xs">
            <q-icon name="people" size="sm" class="q-mr-xs" />
            Characters Here ({{ charactersHere.length }})
          </div>
          <div class="characters-list text-caption">
            <div
              v-for="char in charactersHere"
              :key="char.id"
              class="character-item flex justify-between q-py-xs"
            >
              <span>{{ char.name }}</span>
              <q-item-label v-if="char.type === 'survivor'">
                HP: {{ char.health.current }}/{{ char.health.max }}
              </q-item-label>
              <q-badge :color="char.type === 'survivor' ? 'positive' : 'negative'">
                {{ char.type }}
              </q-badge>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div v-else class="text-center q-pa-md text-grey">
      No location selected
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {MapCell, useMapStore} from 'src/stores/map-store';
import {
  formatCoordinates,
  getBuildingIcon,
  formatBuildingType,
  getBarricadeStatus
} from 'src/utils/map-utils';

const mapStore = useMapStore();

// Computed properties
const isInBuilding = computed(() => {
  return mapStore.currentCell?.type === 'building' &&
    mapStore.currentCell?.building !== undefined &&
    mapStore.currentBuilding !== null;
});

const currentBuilding = computed(() => {
  return mapStore.currentBuilding || {
    name: 'Unknown Building',
    type: 'BUILDING',
    state: 'normal',
    isPowered: false,
    barricadeLevel: 0,
    doorsOpen: true
  };
});

const adjacentBuildingCount = computed(() => {
  if (!mapStore.mapArea?.grid) return 0;

  let count = 0;

  // Check the current position in the grid
  for (let y = 0; y < mapStore.mapArea.grid.length; y++) {
    for (let x = 0; x < (mapStore.mapArea.grid[y]?.length || 0); x++) {
      const cell = mapStore.mapArea?.grid?.[y]?.[x] as MapCell | undefined;

      // Skip if not adjacent to current cell or is the current cell
      if (!cell || !mapStore.currentCell) continue;
      if (cell.x === mapStore.currentCell.x && cell.y === mapStore.currentCell.y) continue;

      // Check if adjacent
      const isAdjacentX = Math.abs(cell.x - mapStore.currentCell.x) === 1 && cell.y === mapStore.currentCell.y;
      const isAdjacentY = Math.abs(cell.y - mapStore.currentCell.y) === 1 && cell.x === mapStore.currentCell.x;

      if ((isAdjacentX || isAdjacentY) && cell.type === 'building') {
        count++;
      }
    }
  }

  return count;
});

const charactersHere = computed(() => {
  if (!mapStore.currentCell) return [];

  // Get the key for the current location
  const key = `${mapStore.currentCell.x},${mapStore.currentCell.y}`;

  // Return characters at this location
  return mapStore.visibleCharacters[key] || [];
});

// Helper functions
function formatBuildingState(state: string): string {
  switch (state) {
    case 'normal':
      return 'Normal';
    case 'ransacked':
      return 'Ransacked';
    case 'ruined':
      return 'Ruined';
    default:
      return state.charAt(0).toUpperCase() + state.slice(1);
  }
}
</script>

<style scoped>
.map-info {
  margin-top: 16px;
}

.character-item {
  border-bottom: 1px solid var(--md-secondary);
}

.character-item:last-child {
  border-bottom: none;
}
</style>

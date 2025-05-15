<template>
  <div class="map-view">
    <!-- Suburb Information -->
    <div class="suburb-info q-mb-md">
      <div class="text-h6">{{ mapStore.currentSuburb?.name || 'Unknown Area' }}</div>
      <div class="text-caption">
        <template v-if="mapStore.currentCell">
          {{ getLocationDescription() }} [{{ mapStore.currentCell.x }}, {{ mapStore.currentCell.y }}]
        </template>
      </div>
    </div>

    <!-- Map Grid -->
    <div v-if="mapStore.mapArea" class="map-grid">
      <!-- Loop through each cell in the grid -->
      <template v-for="(row, rowIndex) in mapStore.mapArea.grid" :key="'row-' + rowIndex">
        <div
          v-for="(cell, colIndex) in row"
          :key="`cell-${rowIndex}-${colIndex}`"
          class="map-cell"
          :class="getCellClasses(cell)"
          @click="handleCellClick(cell)"
        >
          <div class="cell-content">
            {{ getCellContent(cell) }}
          </div>

          <div v-if="hasCharacters(cell)" class="character-indicator">
            <q-icon name="people" size="xs" />
          </div>
        </div>
      </template>
    </div>

    <!-- Loading State -->
    <div v-else-if="mapStore.loading" class="text-center q-pa-md">
      <q-spinner color="primary" size="3em" />
      <div class="q-mt-sm">Loading map...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="mapStore.error" class="text-negative q-pa-md">
      <div>{{ mapStore.error }}</div>
      <q-btn color="primary" label="Retry" @click="loadMapData" class="q-mt-sm" />
    </div>

    <!-- Building Options (if at a building) -->
    <div v-if="isAtBuilding" class="building-options q-mt-md">
      <q-card flat bordered>
        <q-card-section>
          <div class="text-subtitle1">{{ currentBuildingName }}</div>
          <div class="text-caption">{{ getBuildingStatusDescription() }}</div>

          <!-- Enter/Exit Building Button -->
          <div class="q-mt-sm">
            <q-btn
              v-if="!isInsideBuilding"
              color="primary"
              label="Enter Building"
              icon="login"
              class="q-mr-sm"
              @click="enterBuilding"
              :disable="!canEnterBuilding || characterStore.loading"
            />
            <q-btn
              v-else
              color="primary"
              label="Exit Building"
              icon="logout"
              class="q-mr-sm"
              @click="exitBuilding"
              :disable="!canExitBuilding || characterStore.loading"
            />
          </div>

          <!-- Building Actions (if inside) -->
          <div v-if="isInsideBuilding" class="q-mt-sm">
            <div class="text-subtitle2 q-mb-xs">Building Actions</div>
            <q-btn
              v-if="canBarricade()"
              color="positive"
              label="Barricade"
              icon="construction"
              class="q-mr-sm"
              @click="interactWithBuilding('barricade')"
              :disable="characterStore.loading"
            />
            <q-btn
              v-if="canOpenDoors()"
              color="info"
              label="Open Doors"
              icon="door_front"
              class="q-mr-sm"
              @click="interactWithBuilding('openDoors')"
              :disable="characterStore.loading"
            />
            <q-btn
              v-if="canCloseDoors()"
              color="warning"
              label="Close Doors"
              icon="door_front"
              class="q-mr-sm"
              @click="interactWithBuilding('closeDoors')"
              :disable="characterStore.loading"
            />
            <q-btn
              v-if="canAttackBarricade()"
              color="negative"
              label="Attack Barricade"
              icon="sports_mma"
              class="q-mr-sm"
              @click="interactWithBuilding('attackBarricade')"
              :disable="characterStore.loading"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useMapStore, type MapCell } from 'src/stores/map-store';
import { useCharacterStore } from 'src/stores/character-store';
import socketService from 'src/services/socket.service.js';

const mapStore = useMapStore();
const characterStore = useCharacterStore();

interface CharacterMovedDetail {
  x: number;
  y: number;
}

interface BuildingInteractionDetail {
  action: string;
  buildingId: string;
}

// Computed properties
const currentBuildingName = computed(() => {
  if (mapStore.currentCell?.type === 'building' && mapStore.currentCell?.building) {

    if (mapStore.currentBuilding) {
      return mapStore.currentBuilding.name;
    }

    // Otherwise just return a generic name
    return 'Building';
  }

  return null;
});

const isAtBuilding = computed(() => {
  return mapStore.currentCell?.type === 'building' &&
    mapStore.currentCell?.building !== undefined;
});

const isInsideBuilding = computed(() => {
  return characterStore.getActiveCharacter?.location.isInside || false;
});

const canEnterBuilding = computed(() => {
  // Logic to check if character can enter (could also call an API)
  if (!isAtBuilding.value || isInsideBuilding.value) {
    return false;
  }

  const character = characterStore.getActiveCharacter;
  const building = mapStore.currentBuilding;

  if (!character || !building) {
    return false;
  }

  // Check barricades for zombies
  if (building.barricadeLevel > 0 && character.type === 'zombie') {
    return false;
  }

  // Check heavy barricades for survivors without Free Running
  if (building.barricadeLevel >= 60 && character.type === 'survivor') {
    const hasFreeFunning = character.skills.some(
      skill => skill.name === 'Free Running' && skill.active
    );
    if (!hasFreeFunning) {
      return false;
    }
  }

  // Check closed doors for zombies without Memories of Life
  if (!building.doorsOpen && character.type === 'zombie') {
    const hasMemoriesOfLife = character.skills.some(
      skill => skill.name === 'Memories of Life' && skill.active
    );
    if (!hasMemoriesOfLife) {
      return false;
    }
  }

  return character.actions.availableActions >= 1; // Check AP
});

const canExitBuilding = computed(() => {
  if (!isAtBuilding.value || !isInsideBuilding.value) {
    return false;
  }

  const character = characterStore.getActiveCharacter;
  const building = mapStore.currentBuilding;

  if (!character || !building) {
    return false;
  }

  // Check very heavy barricades for survivors without Free Running
  if (building.barricadeLevel >= 80 && character.type === 'survivor') {
    const hasFreeFunning = character.skills.some(
      skill => skill.name === 'Free Running' && skill.active
    );
    if (!hasFreeFunning) {
      return false;
    }
  }

  return character.actions.availableActions >= 1; // Check AP
});

// Methods for entering/exiting buildings
async function enterBuilding() {
  const activeCharacter = characterStore.getActiveCharacter;
  if (!isAtBuilding.value || !activeCharacter) return;

  try {
    await mapStore.enterBuilding(activeCharacter._id)
      .then(() => {
        // Socket event for real-time updates
        socketService.socket?.emit('building_interaction', {
          characterId: activeCharacter._id,
          action: 'enterBuilding'
        });
      })

  } catch (error) {
    console.error('Failed to enter building:', error);
  }
}

async function exitBuilding() {
  const activeCharacter = characterStore.getActiveCharacter;
  if (!isAtBuilding.value || !activeCharacter) return;

  try {
    await mapStore.exitBuilding(activeCharacter._id)
      .then(() => {
        // Socket event for real-time updates
        socketService.socket?.emit('building_interaction', {
          characterId: activeCharacter._id,
          action: 'exitBuilding'
        });
      });

  } catch (error) {
    console.error('Failed to exit building:', error);
  }
}

// Helper methods
function getLocationDescription() {
  if (!mapStore.currentCell) return '';

  if (mapStore.currentCell.type === 'building' && mapStore.currentCell.building) {
    return isInsideBuilding.value ?
      `Inside ${currentBuildingName.value || 'a building'}` :
      `Outside ${currentBuildingName.value || 'a building'}`;
  } else {
    return 'On the street';
  }
}

function getBuildingStatusDescription() {
  if (!mapStore.currentBuilding) return '';

  const powered = mapStore.currentBuilding.isPowered ? 'Powered' : 'Unpowered';
  const barricadeStatus = mapStore.currentBuilding.barricadeStatus;
  const doorStatus = mapStore.currentBuilding.doorsOpen ? 'Doors Open' : 'Doors Closed';

  return `${powered} | ${barricadeStatus} | ${doorStatus}`;
}

function getCellClasses(cell: MapCell | null) {
  if (!cell) return 'empty';

  let classes = [];

  // Basic type class
  classes.push(cell.type);

  // Current location
  if (mapStore.currentCell &&
    cell.x === mapStore.currentCell.x &&
    cell.y === mapStore.currentCell.y) {
    classes.push('current');
  }

  // Building type specific classes
  if (cell.type === 'building' && cell.building) {
    // Add specific classes based on building type
    if (typeof cell.building === 'object' && cell.building.type) {
      // Use the building type directly from the object
      classes.push(cell.building.type.toLowerCase());
    } else if (typeof cell.building === 'string') {
      // If building is just an ID and we have current building loaded
      if (mapStore.currentBuilding &&
        mapStore.currentCell &&
        mapStore.currentCell.building === cell.building) {
        classes.push(mapStore.currentBuilding.type.toLowerCase());
      }
    }

    // Add state classes if available
    if (typeof cell.building === 'object') {
      if (cell.building.state === 'ransacked') classes.push('ransacked');
      if (cell.building.state === 'ruined') classes.push('ruined');
      if (cell.building.isPowered) classes.push('powered');
    }
  }

  return classes;
}

function getCellContent(cell: MapCell | null) {
  if (!cell) return '';

  if (cell.type === 'building') {
    return 'B';
  }

  return '+';
}

function hasCharacters(cell: MapCell | null) {
  if (!cell) return false;

  return mapStore.getCharactersAt(cell.x, cell.y).length > 0;
}


// Building interaction methods
function canBarricade() {
  if (!isInsideBuilding.value || !characterStore.getActiveCharacter) return false;

  // Only survivors with Construction skill can barricade
  if (characterStore.getActiveCharacter.type !== 'survivor') return false;

  // Check for Construction skill
  const hasConstruction = characterStore.getActiveCharacter.skills.some(
    skill => skill.name === 'Construction' && skill.active
  );

  if (!hasConstruction) return false;

  // Check if there's enough AP (2 AP needed)
  return characterStore.getActiveCharacter.actions.availableActions >= 2;
}

function canOpenDoors() {
  if (!isInsideBuilding.value || !characterStore.getActiveCharacter || !mapStore.currentBuilding) return false;

  // Can't open doors if they're already open
  if (mapStore.currentBuilding.doorsOpen) return false;

  // Survivors can always open doors
  if (characterStore.getActiveCharacter.type === 'survivor') {
    return characterStore.getActiveCharacter.actions.availableActions >= 1;
  }

  // Zombies need Memories of Life
  if (characterStore.getActiveCharacter.type === 'zombie') {
    const hasMemoriesOfLife = characterStore.getActiveCharacter.skills.some(
      skill => skill.name === 'Memories of Life' && skill.active
    );

    return hasMemoriesOfLife && characterStore.getActiveCharacter.actions.availableActions >= 1;
  }

  return false;
}

function canCloseDoors() {
  if (!isInsideBuilding.value || !characterStore.getActiveCharacter || !mapStore.currentBuilding) return false;

  // Can't close doors if they're already closed
  if (!mapStore.currentBuilding.doorsOpen) return false;

  // Survivors can always close doors
  if (characterStore.getActiveCharacter.type === 'survivor') {
    return characterStore.getActiveCharacter.actions.availableActions >= 1;
  }

  // Zombies need Memories of Life
  if (characterStore.getActiveCharacter.type === 'zombie') {
    const hasMemoriesOfLife = characterStore.getActiveCharacter.skills.some(
      skill => skill.name === 'Memories of Life' && skill.active
    );

    return hasMemoriesOfLife && characterStore.getActiveCharacter.actions.availableActions >= 1;
  }

  return false;
}

function canAttackBarricade() {
  if (!isInsideBuilding.value || !characterStore.getActiveCharacter || !mapStore.currentBuilding) return false;

  // Only zombies can attack barricades
  if (characterStore.getActiveCharacter.type !== 'zombie') return false;

  // Can't attack if there's no barricade
  if (mapStore.currentBuilding.barricadeLevel === 0) return false;

  // Check if there's enough AP (1 AP needed)
  return characterStore.getActiveCharacter.actions.availableActions >= 1;
}



function interactWithBuilding(action: string) {
  const activeCharacter = characterStore.getActiveCharacter;
  if (!isInsideBuilding.value || !activeCharacter || !mapStore.currentCell?.building) return;

  const buildingId = mapStore.currentCell.building._id;

  mapStore.interactWithBuilding(
    activeCharacter._id,
    buildingId,
    action
  ).then(result => {
    // Emit socket event for real-time updates
    socketService.interactWithBuilding(
      buildingId,
      action,
      {
        characterId: activeCharacter._id,
        result
      }
    );

    // Dispatch event for ActionLog
    const eventDetail: BuildingInteractionDetail = {
      action,
      buildingId
    };
    const customEvent = new CustomEvent<BuildingInteractionDetail>('building-interaction', {
      detail: eventDetail
    });
    document.dispatchEvent(customEvent);

  }).catch(error => {
    console.error('Building interaction failed:', error);
  });
}

// Cell click handler
function handleCellClick(cell: MapCell | null) {
  const activeCharacter = characterStore.getActiveCharacter;
  if (!cell || !activeCharacter) return;

  // If it's the current cell, show details
  if (mapStore.currentCell &&
    cell.x === mapStore.currentCell.x &&
    cell.y === mapStore.currentCell.y) {
    // If we're in a building, load building details
    if (cell.type === 'building' && cell.building) {
      mapStore.getBuilding(cell.building._id);
    }
    return;
  }

  // If it's adjacent, try to move there
  if (mapStore.isAdjacentToCurrentLocation(cell.x, cell.y)) {
    mapStore.moveCharacter(
      activeCharacter._id,
      cell.x,
      cell.y
    ).then(() => {
      // Emit socket event for real-time updates
      socketService.moveCharacter({
        characterId: activeCharacter._id,
        x: cell.x,
        y: cell.y
      });

      // Dispatch custom event for ActionLog
      const eventDetail: CharacterMovedDetail = { x: cell.x, y: cell.y };
      const customEvent = new CustomEvent<CharacterMovedDetail>('character-moved', {
        detail: eventDetail
      });
      document.dispatchEvent(customEvent);

      // If we're moving to a building, load building details
      if (cell.type === 'building' && cell.building) {
        mapStore.getBuilding(cell.building._id);
      }
    }).catch(error => {
      console.error('Movement failed:', error);
    });
  }
}

// Load map data
function loadMapData() {
  if (!characterStore.getActiveCharacter) return;

  mapStore.loadMapArea(characterStore.getActiveCharacter._id).then(() => {
    // If we're in a building, load building details
    if (mapStore.currentCell?.type === 'building' && mapStore.currentCell?.building) {
      mapStore.getBuilding(mapStore.currentCell.building._id);
    }

    // Join location room for real-time updates
    if (mapStore.currentCell) {
      socketService.joinLocation({
        x: mapStore.currentCell.x,
        y: mapStore.currentCell.y
      });
    }
  });
}

// Socket event listeners
function setupSocketListeners() {
  // Listen for player joined event
  socketService.on('player_joined', (data) => {
    // Reload map data to update visible characters
    loadMapData();
  });

  // Listen for player left event
  socketService.on('player_left', (data) => {
    // Reload map data to update visible characters
    loadMapData();
  });

  // Listen for building updated event
  socketService.on('building_updated', (data) => {
    // If we're in this building, reload building details
    if (mapStore.currentCell?.type === 'building' &&
      mapStore.currentCell?.building === data.buildingId) {
      mapStore.getBuilding(data.buildingId);
    }
  });
}

// Lifecycle hooks
onMounted(() => {
  loadMapData();
  setupSocketListeners();
});

// Watch for active character changes
watch(() => characterStore.getActiveCharacter, (newActiveCharacter) => {
  if (newActiveCharacter) {
    loadMapData();
  }
});

// Clean up socket listeners on component unmount
onUnmounted(() => {
  socketService.socket?.off('player_joined');
  socketService.socket?.off('player_left');
  socketService.socket?.off('building_updated');
});
</script>

<style scoped>
.map-view {
  max-width: 600px;
  margin: 0 auto;
}

.map-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 2px;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: 400px;
  margin: 0 auto;
  border: 1px solid var(--md-accent);
  background-color: var(--md-background);
}

.map-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--md-accent);
  padding: 4px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 33%;
}

.map-cell:hover {
  background-color: var(--md-secondary);
}

.map-cell.street {
  background-color: var(--md-street);
  color: var(--md-text);
}

.map-cell.building {
  background-color: var(--md-card-background);
  color: var(--md-text);
}

.map-cell.current {
  background-color: var(--md-accent);
  color: var(--md-background);
  font-weight: bold;
}

.map-cell.empty {
  background-color: #000;
  color: #333;
  cursor: default;
}

.map-cell.hospital {
  background-color: var(--md-hospital);
  color: var(--md-background);
}

.map-cell.police_department {
  background-color: var(--md-police);
  color: var(--md-background);
}

.map-cell.necrotech {
  background-color: var(--md-necrotech);
  color: var(--md-background);
}

.map-cell.mall {
  background-color: var(--md-mall);
  color: var(--md-background);
}

.map-cell.auto_repait {
  background-color: var(--md-auto-repair);
  color: var(--md-background);
}

.map-cell.junkyard {
  background-color: var(--md-junkyard);
  color: var(--md-background);
}

.cell-content {
  font-size: 1.5rem;
  font-weight: bold;
}

.character-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  background-color: var(--md-positive);
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

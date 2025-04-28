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

    <!-- Movement Controls -->
    <div class="movement-controls q-mb-md">
      <div class="row q-col-gutter-sm justify-center">
        <div class="col-12 text-center">
          <q-btn
            color="primary"
            icon="north"
            @click="move('north')"
            :disable="!canMove('north') || characterStore.loading"
          />
        </div>
        <div class="col text-right">
          <q-btn
            color="primary"
            icon="west"
            @click="move('west')"
            :disable="!canMove('west') || characterStore.loading"
          />
        </div>
        <div class="col text-center">
          <q-btn
            color="primary"
            icon="home"
            @click="enterOrExitBuilding()"
            :disable="!canEnterOrExitBuilding() || characterStore.loading"
          />
        </div>
        <div class="col text-left">
          <q-btn
            color="primary"
            icon="east"
            @click="move('east')"
            :disable="!canMove('east') || characterStore.loading"
          />
        </div>
        <div class="col-12 text-center">
          <q-btn
            color="primary"
            icon="south"
            @click="move('south')"
            :disable="!canMove('south') || characterStore.loading"
          />
        </div>
      </div>
    </div>

    <!-- Building Information (if inside a building) -->
    <div v-if="isInsideBuilding" class="building-info q-mb-md">
      <q-card flat bordered>
        <q-card-section>
          <div class="text-subtitle1">{{ currentBuildingName }}</div>
          <div class="text-caption">{{ getBuildingStatusDescription() }}</div>

          <div class="q-mt-sm">
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

    <!-- Characters at Location -->
    <div v-if="mapStore.charactersAtCurrentLocation.length > 0" class="characters-at-location q-mb-md">
      <q-card flat bordered>
        <q-card-section>
          <div class="text-subtitle1">Characters Here:</div>
          <q-list dense>
            <q-item v-for="character in mapStore.charactersAtCurrentLocation" :key="character.id">
              <q-item-section>
                <q-item-label>
                  {{ character.name }}
                  <q-badge
                    :color="character.type === 'survivor' ? 'positive' : 'negative'"
                    class="q-ml-sm"
                  >
                    {{ character.type }}
                  </q-badge>
                  <span v-if="character.isCurrentCharacter" class="text-italic q-ml-sm">(You)</span>
                </q-item-label>
                <q-item-label v-if="character.type === 'survivor'" caption>
                  HP: {{ character.health.current }}/{{ character.health.max }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
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

// Computed properties
const currentBuildingName = computed(() => {
  if (mapStore.currentCell?.type === 'building' && mapStore.currentCell?.building) {
    const buildingId = mapStore.currentCell.building;

    // If we have building details loaded
    if (mapStore.currentBuilding?._id === buildingId) {
      return mapStore.currentBuilding.name;
    }

    // Otherwise just return a generic name
    return 'Building';
  }

  return null;
});

const isInsideBuilding = computed(() => {
  return mapStore.currentCell?.type === 'building' && !!mapStore.currentCell?.building;
});

// Helper methods
function getLocationDescription() {
  if (!mapStore.currentCell) return '';

  if (mapStore.currentCell.type === 'building' && mapStore.currentCell.building) {
    return `Inside ${currentBuildingName.value || 'a building'}`;
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
    // This would need to be expanded based on actual data
    if (mapStore.currentBuilding && mapStore.currentBuilding._id === cell.building) {
      classes.push(mapStore.currentBuilding.type.toLowerCase());
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

// Movement methods
function canMove(direction: 'north' | 'east' | 'south' | 'west') {
  if (!mapStore.currentCell) return false;

  const { x, y } = mapStore.currentCell;

  switch (direction) {
    case 'north':
      return mapStore.getCellAt(x, y - 1) !== null;
    case 'east':
      return mapStore.getCellAt(x + 1, y) !== null;
    case 'south':
      return mapStore.getCellAt(x, y + 1) !== null;
    case 'west':
      return mapStore.getCellAt(x - 1, y) !== null;
  }
}

function move(direction: 'north' | 'east' | 'south' | 'west') {
  const activeCharacter = characterStore.getActiveCharacter;
  if (!mapStore.currentCell || !activeCharacter) return;

  const { x, y } = mapStore.currentCell;
  let targetX = x;
  let targetY = y;

  switch (direction) {
    case 'north':
      targetY -= 1;
      break;
    case 'east':
      targetX += 1;
      break;
    case 'south':
      targetY += 1;
      break;
    case 'west':
      targetX -= 1;
      break;
  }

  // Check if the move is valid
  const targetCell = mapStore.getCellAt(targetX, targetY);
  if (!targetCell) return;

  // Move the character
  mapStore.moveCharacter(
    activeCharacter._id,
    targetX,
    targetY
  ).then(() => {
    // Emit socket event for real-time updates
    socketService.moveCharacter({
      characterId: activeCharacter._id,
      x: targetX,
      y: targetY
    });
  }).catch(error => {
    console.error('Movement failed:', error);
  });
}

function canEnterOrExitBuilding() {
  if (!mapStore.currentCell) return false;

  // If we're on a street with an adjacent building
  if (mapStore.currentCell.type === 'street') {
    // Check for adjacent buildings
    const { x, y } = mapStore.currentCell;
    const adjacentCells = [
      mapStore.getCellAt(x, y - 1), // North
      mapStore.getCellAt(x + 1, y), // East
      mapStore.getCellAt(x, y + 1), // South
      mapStore.getCellAt(x - 1, y)  // West
    ];

    return adjacentCells.some(cell => cell?.type === 'building');
  }

  // If we're in a building, we can always try to exit
  return mapStore.currentCell.type === 'building';
}

function enterOrExitBuilding() {
  const activeCharacter = characterStore.getActiveCharacter;
  if (!mapStore.currentCell || !activeCharacter) return;

  const { x, y } = mapStore.currentCell;

  // If we're in a building, try to exit to the street
  if (mapStore.currentCell.type === 'building') {
    // Look for adjacent street spaces
    const adjacentCells = [
      { x: x, y: y - 1, dir: 'north' }, // North
      { x: x + 1, y: y, dir: 'east' },  // East
      { x: x, y: y + 1, dir: 'south' }, // South
      { x: x - 1, y: y, dir: 'west' }   // West
    ];

    for (const pos of adjacentCells) {
      const cell = mapStore.getCellAt(pos.x, pos.y);
      if (cell && cell.type === 'street') {
        // Move to the first adjacent street
        mapStore.moveCharacter(
          activeCharacter._id,
          pos.x,
          pos.y
        ).then(() => {
          // Emit socket event for real-time updates
          socketService.moveCharacter({
            characterId: activeCharacter._id,
            x: pos.x,
            y: pos.y
          });
        }).catch(error => {
          console.error('Exit building failed:', error);
        });
        return;
      }
    }
  }
  // If we're on a street, try to enter an adjacent building
  else if (mapStore.currentCell.type === 'street') {
    // Look for adjacent buildings
    const adjacentCells = [
      { x: x, y: y - 1, dir: 'north' }, // North
      { x: x + 1, y: y, dir: 'east' },  // East
      { x: x, y: y + 1, dir: 'south' }, // South
      { x: x - 1, y: y, dir: 'west' }   // West
    ];

    for (const pos of adjacentCells) {
      const cell = mapStore.getCellAt(pos.x, pos.y);
      if (cell && cell.type === 'building') {
        // Move to the first adjacent building
        mapStore.moveCharacter(
          activeCharacter._id,
          pos.x,
          pos.y
        ).then(() => {
          // Emit socket event for real-time updates
          socketService.moveCharacter({
            characterId: activeCharacter._id,
            x: pos.x,
            y: pos.y
          });

          // Load building details
          if (cell.building) {
            mapStore.getBuilding(cell.building);
          }
        }).catch(error => {
          console.error('Enter building failed:', error);
        });
        return;
      }
    }
  }
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

  const buildingId = mapStore.currentCell.building;

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
      mapStore.getBuilding(cell.building);
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

      // If we're moving to a building, load building details
      if (cell.type === 'building' && cell.building) {
        mapStore.getBuilding(cell.building);
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
      mapStore.getBuilding(mapStore.currentCell.building);
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

.movement-controls {
  margin-top: 20px;
}
</style>

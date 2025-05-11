<template>
  <div class="action-log">
    <q-card>
      <q-card-section>
        <div class="text-subtitle1">Game Log</div>
        <q-separator />
          <q-item-section>
            <q-scroll-area style="height: 200px;" class="q-mt-sm">
              <div v-if="actions.length === 0" class="text-center text-grey q-py-sm">
                No recent actions
              </div>
              <q-list dense>
                <q-item v-for="(action, index) in actions" :key="index">
                  <q-item-section>
                    <q-item-label caption>
                      {{ formatTimestamp(action.timestamp) }}
                    </q-item-label>
                    <q-item-label :class="getActionClass(action.type)">
                      {{ action.message }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-scroll-area>
          </q-item-section>
      </q-card-section>
    </q-card>
  </div>

</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import socketService from 'src/services/socket.service.js';
import { useMapStore } from 'src/stores/map-store';
import { useCharacterStore } from 'src/stores/character-store';

const mapStore = useMapStore();
const characterStore = useCharacterStore();

type ActionType = 'movement' | 'building' | 'combat' | 'system';

interface ActionLogEntry {
  type: ActionType;
  message: string;
  timestamp: Date;
}

// For custom events
interface CharacterMovedDetail {
  x: number;
  y: number;
}

interface BuildingInteractionDetail {
  action: string;
  buildingId: string;
}

const actions = ref<ActionLogEntry[]>([]);
const MAX_ACTIONS = 50;

// Helper functions
const formatTimestamp = (timestamp: Date): string => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getActionClass = (type: ActionType): string => {
  switch (type) {
    case 'movement': return 'text-info';
    case 'building': return 'text-positive';
    case 'combat': return 'text-negative';
    case 'system': return 'text-warning';
    default: return '';
  }
};

const addAction = (type: ActionType, message: string): void => {
  actions.value.unshift({
    type,
    message,
    timestamp: new Date()
  });

  // Limit the number of actions stored
  if (actions.value.length > MAX_ACTIONS) {
    actions.value = actions.value.slice(0, MAX_ACTIONS);
  }
};

// Define the event handlers
function handlePlayerJoined(data: { username: string }): void {
  if (data.username !== characterStore.getActiveCharacter?.name) {
    addAction('system', `${data.username} has arrived.`);
  }
}

function handlePlayerLeft(data: { username: string }): void {
  addAction('system', `${data.username} has left.`);
}

function handleBuildingUpdated(data: {
  username: string;
  action: string;
  buildingId: string;
}): void {
  const actionMessages: Record<string, string> = {
    'barricade': `${data.username} strengthened the barricades.`,
    'attackBarricade': `${data.username} attacked the barricades.`,
    'openDoors': `${data.username} opened the doors.`,
    'closeDoors': `${data.username} closed the doors.`,
    'enterBuilding': `${data.username} entered the building.`,
    'exitBuilding': `${data.username} left the building.`
  };

  const message = actionMessages[data.action] || `${data.username} interacted with the building.`;
  addAction('building', message);
}

function handleCharacterMoved(event: Event): void {
  // Type assertion for custom event
  const customEvent = event as CustomEvent<CharacterMovedDetail>;
  const detail = customEvent.detail;

  if (detail) {
    addAction('movement', `You moved to [${detail.x}, ${detail.y}].`);
  }
}

function handleBuildingInteraction(event: Event): void {
  // Type assertion for custom event
  const customEvent = event as CustomEvent<BuildingInteractionDetail>;
  const detail = customEvent.detail;

  if (detail) {
    const actionMessages: Record<string, string> = {
      'barricade': 'You strengthened the barricades.',
      'attackBarricade': 'You attacked the barricades.',
      'openDoors': 'You opened the doors.',
      'closeDoors': 'You closed the doors.'
    };

    const message = actionMessages[detail.action] || 'You interacted with the building.';
    addAction('building', message);
  }
}

// Set up event listeners
onMounted(() => {
  addAction('system', 'Connected to game server');

  // Set up socket listeners
  socketService.on('player_joined', handlePlayerJoined);
  socketService.on('player_left', handlePlayerLeft);
  socketService.on('building_updated', handleBuildingUpdated);

  // Set up DOM event listeners
  document.addEventListener('character-moved', handleCharacterMoved);
  document.addEventListener('building-interaction', handleBuildingInteraction);
});

// Clean up event listeners
onUnmounted(() => {
  socketService.socket?.off('player_joined', handlePlayerJoined);
  socketService.socket?.off('player_left', handlePlayerLeft);
  socketService.socket?.off('building_updated', handleBuildingUpdated);

  document.removeEventListener('character-moved', handleCharacterMoved);
  document.removeEventListener('building-interaction', handleBuildingInteraction);
});

// Expose methods if we need to call them from a parent component
defineExpose({
  addAction
});
</script>

<style scoped>
.action-log {
  max-height: 300px;
}
</style>

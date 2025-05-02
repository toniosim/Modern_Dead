<template>
  <q-card class="debug-panel q-pa-md" bordered>
    <q-card-section>
      <div class="text-h6 flex justify-between">
        Debug Tools
        <q-btn icon="close" flat dense round @click="$emit('close')" />
      </div>
    </q-card-section>

    <q-separator />

    <!-- AP Management Section -->
    <q-card-section>
      <div class="text-subtitle1">AP Management</div>

      <div class="row q-col-gutter-sm q-my-sm">
        <div class="col-12 col-sm-6">
          <q-input v-model.number="apAmount" type="number" label="AP Amount" min="1" max="50" />
        </div>
        <div class="col-12 col-sm-6 flex items-center">
          <q-btn color="positive" label="Set AP" class="q-mr-sm" @click="setAP" />
          <q-btn color="primary" label="Max AP" @click="maxAP" />
        </div>
      </div>
    </q-card-section>

    <!-- Teleport Section -->
    <q-card-section>
      <div class="text-subtitle1">Teleport Character</div>

      <div class="row q-col-gutter-sm q-my-sm">
        <div class="col-6">
          <q-input v-model.number="teleportX" type="number" label="X Coord" min="0" max="99" />
        </div>
        <div class="col-6">
          <q-input v-model.number="teleportY" type="number" label="Y Coord" min="0" max="99" />
        </div>
        <div class="col-12 flex justify-end q-mt-sm">
          <q-btn color="warning" label="Teleport" @click="teleport" />
        </div>
      </div>
    </q-card-section>

    <!-- Building Search Section -->
    <q-card-section>
      <div class="text-subtitle1">Find Building</div>

      <div class="row q-col-gutter-sm q-my-sm">
        <div class="col-12">
          <q-select
            v-model="selectedBuildingType"
            :options="buildingTypeOptions"
            label="Building Type"
          />
        </div>
        <div class="col-12 flex justify-end q-mt-sm">
          <q-btn color="info" label="Find Nearest" @click="findBuilding" :disable="!selectedBuildingType" />
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useCharacterStore } from 'src/stores/character-store';
import { useMapStore } from 'src/stores/map-store';
import { api } from 'src/boot/axios';

// Store references
const characterStore = useCharacterStore();
const mapStore = useMapStore();

// State
const apAmount = ref(50);
const teleportX = ref(0);
const teleportY = ref(0);
const selectedBuildingType = ref(null);

// Building type options
const buildingTypeOptions = [
  'HOSPITAL',
  'POLICE_DEPARTMENT',
  'FIRE_STATION',
  'NECROTECH',
  'MALL',
  'CHURCH',
  'AUTO_REPAIR',
  'PUB',
  'WAREHOUSE'
];

// Methods
const setAP = async () => {
  if (!characterStore.getActiveCharacter) return;

  try {
    // Make a direct call to debug endpoint to set AP
    await api.post('/debug/set-ap', {
      characterId: characterStore.getActiveCharacter._id,
      amount: apAmount.value
    });

    // Update local AP info
    characterStore.updateApInfo({
      current: apAmount.value
    });
  } catch (error) {
    console.error('Failed to set AP:', error);
  }
};

const maxAP = async () => {
  if (!characterStore.getActiveCharacter) return;

  try {
    // Make a direct call to debug endpoint to max out AP
    await api.post('/debug/max-ap', {
      characterId: characterStore.getActiveCharacter._id
    });

    // Update local AP info
    characterStore.updateApInfo({
      current: characterStore.maxAp
    });
  } catch (error) {
    console.error('Failed to max AP:', error);
  }
};

const teleport = async () => {
  if (!characterStore.getActiveCharacter) return;

  try {
    // Make a direct call to debug endpoint to teleport
    await api.post('/debug/teleport', {
      characterId: characterStore.getActiveCharacter._id,
      x: teleportX.value,
      y: teleportY.value
    });

    // Reload map area to reflect the new position
    await mapStore.loadMapArea(characterStore.getActiveCharacter._id);
  } catch (error) {
    console.error('Failed to teleport:', error);
  }
};

const findBuilding = async () => {
  if (!characterStore.getActiveCharacter || !selectedBuildingType.value) return;

  try {
    // Search for nearest building of selected type
    const response = await api.get(`/debug/find-building/${selectedBuildingType.value}`);

    if (response.data && response.data.x !== undefined && response.data.y !== undefined) {
      // Set teleport coordinates to found building
      teleportX.value = response.data.x;
      teleportY.value = response.data.y;
    }
  } catch (error) {
    console.error('Failed to find building:', error);
  }
};
</script>

<style scoped>
.debug-panel {
  background-color: rgba(33, 33, 33, 0.9);
  border: 2px solid var(--md-warning);
  max-width: 450px;
}
</style>

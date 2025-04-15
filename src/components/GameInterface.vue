<!-- src/components/GameInterface.vue -->
<template>
  <div class="game-interface">
    <div class="row">
      <!-- Character Status Panel -->
      <div class="col-12 col-md-3">
        <q-card class="character-status-panel">
          <q-card-section>
            <div class="text-h6">Character Status</div>

            <!-- AP Display Component -->
            <ap-display
              :in-building= true
              :building-id= "building123"
            />

            <!-- Other status information -->
            <div class="character-status q-mt-md">
              <div class="row q-col-gutter-sm">
                <div class="col-6">
                  <div class="status-hp character-status-box">
                    <div>HP: 100 </div> <!-- Replace with character.hp  -->
                  </div>
                </div>
                <div class="col-6">
                  <div class="character-status-box">
                    <div>XP: 100 </div> <!-- Replace with character.xp  -->
                  </div>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Action Panel -->
      <div class="col-12 col-md-9">
        <q-card class="action-panel">
          <q-card-section>
            <div class="text-h6">Available Actions</div>

            <div class="action-buttons q-mt-md">
              <!-- Movement Actions -->
              <q-btn color="primary" label="Move North" class="q-mr-sm">
                <ap-cost-indicator :cost="1" />
              </q-btn>

              <!-- Combat Actions -->
              <q-btn color="negative" label="Attack" class="q-mr-sm">
                <ap-cost-indicator :cost="3" />
              </q-btn>

              <!-- Search Action -->
              <q-btn color="secondary" label="Search" class="q-mr-sm">
                <ap-cost-indicator :cost="5" />
              </q-btn>

              <!-- Barricade Action (higher cost) -->
              <q-btn color="warning" label="Barricade" class="q-mr-sm">
                <ap-cost-indicator :cost="10" :show-warning-at="0.3" />
              </q-btn>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Regeneration Timer (floating) -->
    <div class="regeneration-timer-container">
      <ap-regeneration-indicator />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCharacterStore } from 'src/stores/character-store';
import ApDisplay from 'components/ap/ApDisplay.vue';
import ApCostIndicator from 'components/ap/ApCostIndicator.vue';
import ApRegenerationIndicator from 'components/ap/ApRegenerationIndicator.vue';

const characterStore = useCharacterStore();
const inBuilding = ref(false);
const currentBuilding = ref<{ id: string; name: string } | null>(null);

// Computed properties
const character = computed(() => characterStore.getActiveCharacter || {});

// Set up mock data for example
onMounted(() => {
  // For demo purposes
  inBuilding.value = true;
  currentBuilding.value = { id: 'building123', name: 'Hospital' };

  // Fetch AP info
  characterStore.fetchApInfo();
});
</script>

<style scoped>
.character-status-panel, .action-panel {
  margin-bottom: 16px;
}

.character-status-box {
  border: 1px solid var(--md-accent);
  border-radius: 4px;
  padding: 8px;
  background-color: var(--md-primary);
}

.status-hp {
  border-left: 3px solid var(--md-negative);
}

.regeneration-timer-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.action-buttons .q-btn {
  position: relative;
  margin-bottom: 8px;
}

.action-buttons .q-btn .ap-cost-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
}
</style>

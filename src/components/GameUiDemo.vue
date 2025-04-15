<template>
  <q-card class="game-interface q-pa-md">
    <q-card-section>
      <div class="text-h6">Game UI Demo</div>
      <div class="text-subtitle2">Modern Dead UI in Urban Dead style</div>
    </q-card-section>

    <!-- Location Info -->
    <q-card-section>
      <div class="location-info q-mb-md">
        <div class="text-h6">Ridleybank</div>
        <div class="text-subtitle2 street">
          Blackmore Street [32, 45]
        </div>
        <div class="text-caption">Outside a <span class="necrotech">NecroTech Building</span></div>
      </div>
    </q-card-section>

    <!-- Map Grid -->
    <q-card-section>
      <div class="map-grid q-mb-md">
        <div class="row">
          <div class="col-4 map-cell">Warehouse</div>
          <div class="col-4 map-cell street">Street</div>
          <div class="col-4 map-cell hospital">Hospital</div>
        </div>
        <div class="row">
          <div class="col-4 map-cell street">Street</div>
          <div class="col-4 map-cell current">NecroTech Building</div>
          <div class="col-4 map-cell street">Street</div>
        </div>
        <div class="row">
          <div class="col-4 map-cell police">Police Dept.</div>
          <div class="col-4 map-cell street">Street</div>
          <div class="col-4 map-cell">Church</div>
        </div>
      </div>
    </q-card-section>

    <!-- Status Info -->
    <q-card-section>
      <div class="player-status q-mb-md">
        <div class="flex justify-between q-mb-sm">
          <div>HP: <span class="hp-healthy">50/50</span></div>
          <div>AP: <span class="ap-available">43/50</span></div>
        </div>
        <div class="flex justify-between">
          <div>XP: 345</div>
          <div>Level: 12</div>
        </div>
      </div>
    </q-card-section>

    <!-- Characters in location -->
    <q-card-section>
      <div class="text-h6 q-mb-sm">Characters Here:</div>
      <div class="character-list q-mb-md">
        <div class="character military q-mb-xs">
          Sgt. Sanders <span class="text-caption">(48 HP)</span>
        </div>
        <div class="character civilian q-mb-xs">
          Anna Wright <span class="text-caption hp-injured">(23 HP)</span>
        </div>
        <div class="character scientist q-mb-xs">
          Dr. Hughes <span class="text-caption hp-critical">(11 HP)</span> <span class="infected">[Infected]</span>
        </div>
        <div class="character zombie q-mb-xs">
          Dave Zombie
        </div>
      </div>
    </q-card-section>

    <!-- Inventory -->
    <q-card-section>
      <div class="text-h6 q-mb-sm">Inventory:</div>
      <div class="inventory-list q-mb-md">
        <div class="inventory-item weapon q-mb-xs">
          Pistol
        </div>
        <div class="inventory-item ammo q-mb-xs">
          Pistol Clip (3)
        </div>
        <div class="inventory-item healing q-mb-xs">
          First Aid Kit (2)
        </div>
        <div class="inventory-item tool q-mb-xs">
          Radio Transmitter
        </div>
      </div>
    </q-card-section>

    <!-- Messages -->
    <q-card-section>
      <div class="text-h6 q-mb-sm">Recent Messages:</div>
      <div class="message-list q-mb-md">
        <div class="message q-mb-xs">
          <span class="military">Sgt. Sanders</span>: "We need to barricade this building before nightfall."
        </div>
        <div class="message radio q-mb-xs">
          <span class="text-caption">[27.81 MHz]</span> <span class="scientist">Dr. Hughes</span>: "Requesting medical assistance at NecroTech building in Ridleybank."
        </div>
        <div class="message graffiti q-mb-xs">
          The wall reads: "Revive point - stand here"
        </div>
        <div class="message zombie q-mb-xs">
          <span class="zombie">Dave Zombie</span>: "Mrh. Graaah. Braaaains."
        </div>
      </div>
    </q-card-section>

    <!-- Action buttons -->
    <q-card-section>
      <div class="text-h6 q-mb-sm">Actions:</div>
      <div class="action-buttons q-mb-md">
        <button class="ud-button">Search</button>
        <button class="ud-button">Attack</button>
        <button class="ud-button">Barricade</button>
        <button class="ud-button">Enter Building</button>
        <button class="ud-button">Use Radio</button>
      </div>
    </q-card-section>

    <q-card-section>
      <div class="text-h6 q-mb-sm">Action System Demo:</div>

      <!-- AP Status Display -->
      <div class="ap-status q-pa-sm q-mb-md">
        <div class="row justify-between">
          <div class="text-subtitle2">Action Points: {{ currentAp }}/50</div>
          <div>
            <q-btn
              flat
              dense
              color="primary"
              label="Reset AP"
              @click="resetAp"
              size="sm"
            />
          </div>
        </div>
        <q-linear-progress
          :value="currentAp / 50"
          :color="apProgressColor"
          class="q-mt-xs"
          size="md"
        />
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons q-mb-md">
        <div class="row q-col-gutter-md">
          <!-- Movement action -->
          <div class="col-auto">
            <action-button
              label="Move"
              icon="arrow_forward"
              :ap-cost="1"
              action-type="MOVE"
              color="primary"
              description="Move one block in a direction"
              :current-ap="currentAp"
              @ap-consumed="consumeAp"
              @action-success="handleActionSuccess"
            />
          </div>

          <!-- Attack action -->
          <div class="col-auto">
            <action-button
              label="Attack"
              icon="gps_fixed"
              :ap-cost="3"
              action-type="ATTACK"
              color="negative"
              description="Attack a nearby target"
              :current-ap="currentAp"
              @ap-consumed="consumeAp"
              @action-success="handleActionSuccess"
            />
          </div>

          <!-- Search action -->
          <div class="col-auto">
            <action-button
              label="Search"
              icon="search"
              :ap-cost="5"
              action-type="SEARCH"
              color="info"
              description="Search the building for items"
              :current-ap="currentAp"
              @ap-consumed="consumeAp"
              @action-success="handleActionSuccess"
            />
          </div>

          <!-- Barricade action (high cost to show insufficient AP) -->
          <div class="col-auto">
            <action-button
              label="Barricade"
              icon="construction"
              :ap-cost="15"
              action-type="BARRICADE"
              color="warning"
              description="Strengthen building defenses"
              :current-ap="currentAp"
              @ap-consumed="consumeAp"
              @action-success="handleActionSuccess"
            />
          </div>
        </div>
      </div>

      <!-- Action History -->
      <div v-if="actionHistory.length > 0" class="action-history q-mt-md">
        <div class="text-subtitle2 q-mb-xs">Recent Actions:</div>
        <q-list bordered separator class="action-history-list">
          <q-item v-for="(action, index) in actionHistory" :key="index">
            <q-item-section>
              <q-item-label>{{ action.message }}</q-item-label>
              <q-item-label caption>Cost: {{ action.cost }} AP</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label caption>{{ action.time }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import ActionButton from './ap/ActionButton.vue';

interface ActionHistoryItem {
  type: string;
  cost: number;
  message: string;
  time: string;
}

// Demo state for AP system
const currentAp = ref(50);
const actionHistory = ref<ActionHistoryItem[]>([]);

// Computed properties for AP status
const apProgressColor = computed(() => {
  if (currentAp.value >= 40) return 'positive';
  if (currentAp.value >= 20) return 'warning';
  return 'negative';
});

// Handle AP consumption
const consumeAp = (cost: number) => {
  currentAp.value = Math.max(0, currentAp.value - cost);
};

// Reset AP for demo purposes
const resetAp = () => {
  currentAp.value = 50;
};

// Handle successful actions
const handleActionSuccess = (actionData: { type: string; cost: number }) => {
  // Add to action history
  actionHistory.value.unshift({
    type: actionData.type,
    cost: actionData.cost,
    message: `${actionData.type} action performed!`,
    time: new Date().toLocaleTimeString()
  });

  // Keep only the last 5 actions
  if (actionHistory.value.length > 5) {
    actionHistory.value = actionHistory.value.slice(0, 5);
  }
};
</script>

<style scoped>
.game-interface {
  max-width: 800px;
  margin: 0 auto;
}

.character-list, .inventory-list, .message-list {
  border: 1px solid var(--md-accent);
  padding: 8px;
  background-color: var(--md-primary);
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
}

.ap-status {
  border: 1px solid var(--md-accent);
  border-radius: 4px;
  background-color: var(--md-primary);
}

.action-history-list {
  max-height: 200px;
  overflow-y: auto;
  background-color: var(--md-card-background);
}
</style>

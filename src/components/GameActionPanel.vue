<!-- src/components/GameActionPanel.vue -->
<template>
  <q-card class="game-action-panel">
    <q-card-section>
      <div class="text-h6">Actions</div>

      <div class="action-groups q-mt-md">
        <!-- Movement Actions -->
        <div class="action-group q-mb-md">
          <div class="text-subtitle2">Movement</div>
          <div class="row q-col-gutter-md">
            <div class="col-auto" v-for="(dir, index) in directions" :key="index">
              <action-button
                :label="dir.label"
                :icon="dir.icon"
                :ap-cost="1"
                action-type="MOVE"
                color="primary"
                :action-data="{ direction: dir.value }"
                @action-success="handleMovement"
              />
            </div>

            <!-- Enter/Exit Building -->
            <div class="col-auto">
              <action-button
                :label="inBuilding ? 'Exit Building' : 'Enter Building'"
                :icon="inBuilding ? 'exit_to_app' : 'meeting_room'"
                :ap-cost="1"
                :action-type="inBuilding ? 'EXIT_BUILDING' : 'ENTER_BUILDING'"
                color="secondary"
                @action-success="handleBuildingToggle"
              />
            </div>
          </div>
        </div>

        <!-- Combat Actions -->
        <div class="action-group q-mb-md" v-if="showCombatActions">
          <div class="text-subtitle2">Combat</div>
          <div class="row q-col-gutter-md">
            <!-- Character-specific attack options -->
            <div class="col-auto" v-if="isZombie">
              <action-button
                label="Bite"
                icon="sanitizer"
                :ap-cost="3"
                action-type="BITE_ATTACK"
                color="negative"
                description="Attack with zombie bite (chance to infect)"
                @action-success="handleAttack"
              />
            </div>

            <div class="col-auto" v-else>
              <action-button
                label="Punch"
                icon="sports_martial_arts"
                :ap-cost="3"
                action-type="MELEE_ATTACK"
                color="negative"
                description="Basic melee attack"
                @action-success="handleAttack"
              />
            </div>

            <!-- Weapon attacks (survivor only) -->
            <div class="col-auto" v-if="hasFirearm">
              <action-button
                label="Shoot"
                icon="gps_fixed"
                :ap-cost="3"
                action-type="FIREARM_ATTACK"
                color="negative"
                description="Fire a ranged weapon"
                @action-success="handleAttack"
              />
            </div>
          </div>
        </div>

        <!-- Building Actions -->
        <div class="action-group q-mb-md" v-if="inBuilding">
          <div class="text-subtitle2">Building</div>
          <div class="row q-col-gutter-md">
            <div class="col-auto">
              <action-button
                label="Search"
                icon="search"
                :ap-cost="5"
                action-type="SEARCH"
                color="info"
                description="Search the building for items"
                @action-success="handleSearch"
              />
            </div>

            <div class="col-auto" v-if="!isZombie && canBarricade">
              <action-button
                label="Barricade"
                icon="construction"
                :ap-cost="3"
                action-type="BARRICADE"
                color="warning"
                description="Strengthen building defenses"
                @action-success="handleBarricade"
              />
            </div>

            <div class="col-auto" v-if="isZombie">
              <action-button
                label="Ransack"
                icon="broken_image"
                :ap-cost="5"
                action-type="RANSACK"
                color="negative"
                description="Damage the building interior"
                @action-success="handleRansack"
              />
            </div>
          </div>
        </div>

        <!-- Special Actions -->
        <div class="action-group" v-if="showSpecialActions">
          <div class="text-subtitle2">Special</div>
          <div class="row q-col-gutter-md">
            <div class="col-auto" v-if="!isZombie && canHeal">
              <action-button
                label="Heal"
                icon="healing"
                :ap-cost="3"
                action-type="HEAL"
                color="positive"
                description="Use first aid kit to heal wounds"
                @action-success="handleHeal"
              />
            </div>

            <div class="col-auto" v-if="!isZombie && canRevive">
              <action-button
                label="Revive Zombie"
                icon="volunteer_activism"
                :ap-cost="10"
                action-type="REVIVE"
                color="positive"
                description="Use syringe to revive a zombie"
                @action-success="handleRevive"
              />
            </div>

            <div class="col-auto" v-if="!isResting && inBuilding">
              <action-button
                label="Rest"
                icon="hotel"
                :ap-cost="1"
                action-type="REST"
                color="primary"
                description="Rest to regenerate AP faster"
                @action-success="handleRest"
              />
            </div>
          </div>
        </div>
      </div>
    </q-card-section>

    <!-- Action result notifications -->
    <q-dialog v-model="showActionResult">
      <q-card>
        <q-card-section :class="actionResultClass">
          <div class="text-h6">{{ actionResultTitle }}</div>
          <p>{{ actionResultMessage }}</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCharacterStore } from 'src/stores/character-store';
import ActionButton from 'components/ap/ActionButton.vue';

const characterStore = useCharacterStore();

// Local state
const inBuilding = ref(false);
const isResting = computed(() => characterStore.isResting);
const showActionResult = ref(false);
const actionResultTitle = ref('');
const actionResultMessage = ref('');
const actionResultClass = ref('');

// Computed properties
const character = computed(() => characterStore.getActiveCharacter || {});
const isZombie = computed(() => character.value?.type === 'zombie');

// Sample directions for movement
const directions = [
  { label: 'North', icon: 'arrow_upward', value: 'north' },
  { label: 'East', icon: 'arrow_forward', value: 'east' },
  { label: 'South', icon: 'arrow_downward', value: 'south' },
  { label: 'West', icon: 'arrow_back', value: 'west' }
];

// Show specific action groups based on character state
const showCombatActions = computed(() => {
  // Only show if there are targets available (simplified)
  return true;
});

const showSpecialActions = computed(() => {
  return inBuilding.value || (!isZombie.value && character.value?.health.current < character.value?.health.max);
});

// Check for specific capabilities
const hasFirearm = computed(() => {
  // Check if character has firearm in inventory (simplified)
  return !isZombie.value && character.value?.skills.some(s => s.name === 'Basic Firearms Training' && s.active);
});

const canBarricade = computed(() => {
  return character.value?.skills.some(s => s.name === 'Construction' && s.active);
});

const canHeal = computed(() => {
  // Check if character has first aid skill and items (simplified)
  return character.value?.skills.some(s => s.name === 'First Aid' && s.active);
});

const canRevive = computed(() => {
  // Check if character has lab experience skill and syringe (simplified)
  return character.value?.skills.some(s => s.name === 'Lab Experience' && s.active);
});

// Action handlers
const handleMovement = async (actionData) => {
  showActionResult.value = true;
  actionResultTitle.value = 'Movement';
  actionResultMessage.value = `You moved ${actionData.data.direction}.`;
  actionResultClass.value = 'text-primary';
};

const handleBuildingToggle = async () => {
  inBuilding.value = !inBuilding.value;

  showActionResult.value = true;
  actionResultTitle.value = inBuilding.value ? 'Entered Building' : 'Exited Building';
  actionResultMessage.value = inBuilding.value ?
    'You entered the building. You can now search for items.' :
    'You exited the building. You are now vulnerable to zombie attacks.';
  actionResultClass.value = 'text-primary';
};

const handleAttack = async (actionData) => {
  showActionResult.value = true;
  actionResultTitle.value = 'Attack';
  actionResultMessage.value = 'You attacked a target.';
  actionResultClass.value = 'bg-negative text-white';
};

const handleSearch = async () => {
  showActionResult.value = true;
  actionResultTitle.value = 'Search';
  actionResultMessage.value = 'You searched the building but found nothing of value.';
  actionResultClass.value = 'text-info';
};

const handleBarricade = async () => {
  showActionResult.value = true;
  actionResultTitle.value = 'Barricade';
  actionResultMessage.value = 'You strengthened the barricades on this building.';
  actionResultClass.value = 'text-warning';
};

const handleRansack = async () => {
  showActionResult.value = true;
  actionResultTitle.value = 'Ransack';
  actionResultMessage.value = 'You ransacked the building, destroying the interior.';
  actionResultClass.value = 'bg-negative text-white';
};

const handleHeal = async () => {
  showActionResult.value = true;
  actionResultTitle.value = 'Healing';
  actionResultMessage.value = 'You used a first aid kit to heal your wounds.';
  actionResultClass.value = 'bg-positive text-white';
};

const handleRevive = async () => {
  showActionResult.value = true;
  actionResultTitle.value = 'Revive';
  actionResultMessage.value = 'You used a syringe to revive a zombie.';
  actionResultClass.value = 'bg-positive text-white';
};

const handleRest = async () => {
  try {
    await characterStore.toggleResting('building123'); // Sample building ID
    showActionResult.value = true;
    actionResultTitle.value = 'Resting';
    actionResultMessage.value = 'You are now resting. Your AP will regenerate faster.';
    actionResultClass.value = 'text-primary';
  } catch (error) {
    showActionResult.value = true;
    actionResultTitle.value = 'Error';
    actionResultMessage.value = 'Failed to start resting.';
    actionResultClass.value = 'bg-negative text-white';
  }
};
</script>

<style scoped>
.game-action-panel {
  width: 100%;
}

.action-group {
  border-radius: 4px;
  padding: 8px;
  background-color: var(--md-primary);
}
</style>

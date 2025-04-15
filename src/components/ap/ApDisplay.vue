<template>
  <div class="ap-display q-pa-sm">
    <div class="row items-center">
      <!-- AP Progress Bar -->
      <div class="col-12">
        <div class="ap-value-display q-mb-xs">
          <span class="text-weight-bold">AP:</span>
          <span :class="apTextClass">{{ Math.floor(currentAp) }}/{{ maxAp }}</span>
        </div>
        <q-linear-progress
          :value="apPercentage / 100"
          :color="apProgressColor"
          class="ap-progress-bar"
          size="md"
        />
      </div>
    </div>

    <!-- Regeneration Info -->
    <div class="ap-regen-info q-mt-xs row items-center justify-between">
      <div class="ap-regen-rate">
        <q-icon name="update" size="xs" class="q-mr-xs" />
        <span>{{ regenerationRate }}/hr</span>
      </div>

      <div class="ap-next-info">
        <template v-if="isApFull">
          <span class="text-positive">Full</span>
        </template>
        <template v-else>
          <q-icon name="schedule" size="xs" class="q-mr-xs" />
          <span>Next: {{ formattedTimeUntilNext }}</span>
        </template>
      </div>
    </div>

    <!-- Resting Toggle (if in building) -->
    <div v-if="inBuilding" class="ap-resting-toggle q-mt-sm">
      <q-btn
        :color="isResting ? 'warning' : 'primary'"
        :icon="isResting ? 'hotel' : 'local_cafe'"
        :label="isResting ? 'Resting' : 'Rest'"
        size="sm"
        dense
        class="full-width"
        :loading="restingLoading"
        @click="toggleResting"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useCharacterStore } from 'src/stores/character-store';

const props = defineProps({
  inBuilding: {
    type: Boolean,
    default: false
  },
  buildingId: {
    type: String,
    default: ''
  }
});

const characterStore = useCharacterStore();
const restingLoading = ref(false);

// Computed properties
const currentAp = computed(() => characterStore.currentAp);
const maxAp = computed(() => characterStore.maxAp);
const apPercentage = computed(() => characterStore.apPercentage);
const isApFull = computed(() => characterStore.isApFull);
const isResting = computed(() => characterStore.isResting);
const regenerationRate = computed(() => {
  return characterStore.apInfo.regenerationRate.toFixed(1);
});

const formattedTimeUntilNext = computed(() => {
  return characterStore.formatTimeUntilNextAp();
});

// Dynamic styling based on AP level
const apProgressColor = computed(() => {
  if (apPercentage.value >= 80) return 'positive';
  if (apPercentage.value >= 40) return 'primary';
  if (apPercentage.value >= 20) return 'warning';
  return 'negative';
});

const apTextClass = computed(() => {
  if (apPercentage.value >= 80) return 'text-positive';
  if (apPercentage.value >= 40) return 'text-primary';
  if (apPercentage.value >= 20) return 'text-warning';
  return 'text-negative';
});

// Methods
const toggleResting = async () => {
  if (!props.inBuilding) return;

  restingLoading.value = true;
  try {
    await characterStore.toggleResting(props.buildingId);
  } catch (error) {
    console.error('Failed to toggle resting:', error);
  } finally {
    restingLoading.value = false;
  }
};

// Start AP updates when component mounts
onMounted(() => {
  characterStore.fetchApInfo();
  characterStore.startApUpdateTimer();
});

// Clean up when component unmounts
onUnmounted(() => {
  characterStore.stopApUpdateTimer();
});
</script>

<style scoped>
.ap-display {
  border: 1px solid var(--md-accent);
  border-radius: 4px;
  background-color: var(--md-primary);
}

.ap-progress-bar {
  border-radius: 2px;
}

.ap-regen-info {
  font-size: 0.8rem;
  color: var(--md-text-secondary);
}

.ap-value-display {
  font-size: 1rem;
}
</style>

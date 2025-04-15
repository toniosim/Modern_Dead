<!-- src/components/ap/ApRegenerationIndicator.vue -->
<template>
  <div class="ap-regeneration-indicator">
    <q-circular-progress
      :value="progressValue"
      :color="progressColor"
      size="40px"
      :thickness="0.15"
      show-value
      class="q-ma-sm"
    >
      <div class="ap-regen-icon">
        <q-icon
          name="bolt"
          size="16px"
          :color="isApFull ? 'positive' : 'grey-7'"
        />
      </div>
    </q-circular-progress>

    <div class="ap-regen-time text-center">
      <template v-if="isApFull">
        <span class="text-positive">AP Full</span>
      </template>
      <template v-else>
        <span>{{ formattedTime }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useCharacterStore } from 'src/stores/character-store';

const characterStore = useCharacterStore();
const updateTimer = ref<number | null>(null);
const secondsLeft = ref(0);

// Computed properties
const isApFull = computed(() => characterStore.isApFull);

const timeUntilNext = computed(() => {
  const timeInfo = characterStore.timeUntilNextAp;
  if (!timeInfo || timeInfo.atMaximum) return 0;
  return timeInfo.secondsUntilNext;
});

const progressValue = computed(() => {
  if (isApFull.value) return 100;

  // This creates a countdown effect from 100 to 0 as time passes
  const totalSeconds = 3600 / (characterStore.apInfo.regenerationRate || 1);
  const progress = ((totalSeconds - secondsLeft.value) / totalSeconds) * 100;
  return Math.min(100, Math.max(0, progress));
});

const progressColor = computed(() => {
  if (isApFull.value) return 'positive';
  if (progressValue.value >= 75) return 'positive';
  if (progressValue.value >= 40) return 'primary';
  if (progressValue.value >= 20) return 'warning';
  return 'negative';
});

const formattedTime = computed(() => {
  if (secondsLeft.value <= 0) return '00:00';

  const minutes = Math.floor(secondsLeft.value / 60);
  const seconds = secondsLeft.value % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

// Methods
const updateSecondsLeft = () => {
  if (isApFull.value) {
    secondsLeft.value = 0;
    return;
  }

  secondsLeft.value = timeUntilNext.value;

  // If we have valid time, start countdown
  if (secondsLeft.value > 0) {
    startCountdown();
  }
};

const startCountdown = () => {
  // Clear existing timer
  if (updateTimer.value) {
    window.clearInterval(updateTimer.value);
  }

  // Start new timer
  updateTimer.value = window.setInterval(() => {
    if (secondsLeft.value <= 0) {
      // Time's up, refresh AP info
      characterStore.fetchApInfo();
      return;
    }

    secondsLeft.value -= 1;
  }, 1000);
};

const stopCountdown = () => {
  if (updateTimer.value) {
    window.clearInterval(updateTimer.value);
    updateTimer.value = null;
  }
};

// Setup and cleanup
onMounted(() => {
  // Initialize seconds left
  updateSecondsLeft();

  // Set up watcher for AP changes
  characterStore.$subscribe((mutation, state) => {
    updateSecondsLeft();
  });
});

onUnmounted(() => {
  stopCountdown();
});
</script>

<style scoped>
.ap-regeneration-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ap-regen-icon {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.ap-regen-time {
  font-size: 0.7rem;
  margin-top: -5px;
}
</style>

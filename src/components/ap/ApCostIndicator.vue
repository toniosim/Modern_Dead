<template>
  <div class="ap-cost-indicator">
    <q-badge
      :color="isAffordable ? 'primary' : 'negative'"
      :text-color="textColor"
      class="ap-cost-badge"
      :class="{ 'ap-cost-inactive': !isAffordable }"
    >
      {{ cost }} AP
    </q-badge>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCharacterStore } from 'src/stores/character-store';

const props = defineProps({
  cost: {
    type: Number,
    required: true
  },
  showWarningAt: {
    type: Number,
    default: 0.5 // Show warning when AP is 50% of current AP
  }
});

const characterStore = useCharacterStore();

// Check if the action is affordable
const isAffordable = computed(() => {
  return characterStore.currentAp >= props.cost;
});

// Determine text color based on AP availability
const textColor = computed(() => {
  if (!isAffordable.value) return 'white';

  // Warning color when AP cost is significant portion of available AP
  const apRatio = props.cost / characterStore.currentAp;
  if (apRatio >= props.showWarningAt) return 'yellow';

  return 'white';
});
</script>

<style scoped>
.ap-cost-indicator {
  display: inline-block;
}

.ap-cost-badge {
  padding: 2px 6px;
  font-size: 0.7rem;
}

.ap-cost-inactive {
  opacity: 0.7;
}
</style>

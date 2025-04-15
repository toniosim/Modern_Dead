<template>
  <div class="action-button-wrapper" :class="{ 'action-disabled': !canPerformAction }">
    <q-btn
      :color="buttonColor"
      :label="label"
      :icon="icon"
      :disable="!canPerformAction"
      :loading="loading"
      @click="executeAction"
      class="action-btn"
      :class="actionButtonClass"
    >
      <!-- AP Cost Badge -->
      <ap-cost-indicator
        :cost="apCost"
        :show-warning-at="showWarningAt"
        class="ap-badge"
      />

      <!-- Tooltip -->
      <q-tooltip
        anchor="center right"
        self="center left"
        :offset="[10, 0]"
        max-width="250px"
        class="action-tooltip"
      >
        <div>
          <div class="text-weight-bold">{{ label }}</div>
          <div class="q-mt-xs">AP Cost: {{ apCost }}</div>
          <div v-if="!canPerformAction" class="text-negative q-mt-xs">
            Not enough AP ({{ currentAp }}/{{ apCost }})
          </div>
          <div v-if="description" class="text-caption q-mt-xs">
            {{ description }}
          </div>
        </div>
      </q-tooltip>
    </q-btn>

    <!-- Optional notification pulse for feedback -->
    <q-badge
      v-if="showFeedback"
      color="accent"
      class="ap-cost-pulse"
      text-color="white"
    >
      -{{ apCost }} AP
    </q-badge>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useCharacterStore } from 'src/stores/character-store';
import ApCostIndicator from './ApCostIndicator.vue';

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  apCost: {
    type: Number,
    required: true
  },
  actionType: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: 'primary'
  },
  showWarningAt: {
    type: Number,
    default: 0.5
  },
  // Optional target ID for actions that require a target
  targetId: {
    type: String,
    default: ''
  },
  // Additional action data
  actionData: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['action-success', 'action-failure']);

const characterStore = useCharacterStore();
const loading = ref(false);
const showFeedback = ref(false);

// Computed properties
const currentAp = computed(() => characterStore.currentAp);
const canPerformAction = computed(() => characterStore.canPerformAction(props.apCost));

const buttonColor = computed(() => {
  // If disabled, use a muted color
  if (!canPerformAction.value) return 'grey-7';
  return props.color;
});

const actionButtonClass = computed(() => {
  return {
    'no-ap': !canPerformAction.value,
    [props.actionType.toLowerCase()]: true
  };
});

// Methods
const executeAction = async () => {
  if (!canPerformAction.value || loading.value) return;

  loading.value = true;

  try {
    // Consume AP first (client-side for immediate feedback)
    const apConsumed = characterStore.consumeAp(props.apCost);

    if (!apConsumed) {
      throw new Error('Failed to consume action points');
    }

    // Show visual feedback
    triggerFeedback();

    // Emit success event with action data
    emit('action-success', {
      type: props.actionType,
      cost: props.apCost,
      targetId: props.targetId,
      data: props.actionData
    });
  } catch (error) {
    console.error('Action execution failed:', error);

    // Emit failure event
    emit('action-failure', {
      type: props.actionType,
      error
    });
  } finally {
    loading.value = false;
  }
};

const triggerFeedback = () => {
  showFeedback.value = true;

  // Hide feedback after animation
  setTimeout(() => {
    showFeedback.value = false;
  }, 1500);
};

// Watch for AP changes to re-evaluate if action can be performed
watch(() => characterStore.currentAp, (newValue) => {
  // If AP changed and now we can perform the action, pulse the button
  if (canPerformAction.value && !loading.value) {
    // Add a temporary class for animation
    const btn = document.querySelector('.action-btn');
    if (btn) {
      btn.classList.add('ap-enabled-pulse');
      setTimeout(() => {
        btn.classList.remove('ap-enabled-pulse');
      }, 1000);
    }
  }
});
</script>

<style scoped>
.action-button-wrapper {
  position: relative;
  display: inline-block;
  margin: 0.5rem;
}

.action-disabled {
  opacity: 0.8;
}

.action-btn {
  position: relative;
  min-width: 120px;
}

.ap-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 5;
}

.ap-cost-pulse {
  position: absolute;
  top: -20px;
  right: -10px;
  animation: pulse-fade 1.5s forwards;
  font-weight: bold;
  opacity: 0;
  z-index: 10;
}

.action-tooltip {
  background-color: var(--md-card-background);
  color: var(--md-text);
  border: 1px solid var(--md-accent);
}

/* Animation for AP consumption feedback */
@keyframes pulse-fade {
  0% {
    opacity: 0;
    transform: translateY(0);
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-30px);
  }
}

/* Animation for when AP becomes available */
.ap-enabled-pulse {
  animation: enabled-pulse 1s;
}

@keyframes enabled-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--md-accent-rgb), 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(var(--md-accent-rgb), 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--md-accent-rgb), 0);
  }
}

/* Action-specific styling */
.action-btn.move {
  background-color: var(--md-primary);
}

.action-btn.attack {
  background-color: var(--md-negative);
}

.action-btn.search {
  background-color: var(--md-secondary);
}

.action-btn.barricade {
  background-color: var(--md-info);
}

.action-btn.heal {
  background-color: var(--md-positive);
}

.action-btn.no-ap {
  background-color: var(--md-dark);
  opacity: 0.7;
}
</style>

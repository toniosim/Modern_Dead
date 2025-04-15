// src/components/ap/ActionButton.vue
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
      <q-badge
        :color="isAffordable ? 'primary' : 'negative'"
        class="ap-badge"
      >
        {{ apCost }} AP
      </q-badge>

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
import { ref, computed } from 'vue';

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
  // For demo purposes - normally this would come from a store
  currentAp: {
    type: Number,
    default: 50
  },
  // For demo purposes - normally would be determined by other factors
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['action-success', 'action-failure', 'ap-consumed']);

const loading = ref(false);
const showFeedback = ref(false);

// Computed properties
const isAffordable = computed(() => props.currentAp >= props.apCost);
const canPerformAction = computed(() => isAffordable.value && !props.disabled);

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
    // Emit AP consumed event (for parent to handle)
    emit('ap-consumed', props.apCost);

    // Show visual feedback
    triggerFeedback();

    // Emit success event with action data
    emit('action-success', {
      type: props.actionType,
      cost: props.apCost
    });
  } catch (error) {
    console.error('Action execution failed:', error);

    // Emit failure event
    emit('action-failure', {
      type: props.actionType,
      error
    });
  } finally {
    setTimeout(() => {
      loading.value = false;
    }, 500); // Short delay for better visual feedback
  }
};

const triggerFeedback = () => {
  showFeedback.value = true;

  // Hide feedback after animation
  setTimeout(() => {
    showFeedback.value = false;
  }, 1500);
};
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

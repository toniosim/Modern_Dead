<!-- src/components/inventory/InventoryPane.vue -->
<template>
  <q-card class="inventory-pane">
    <q-card-section>
      <div class="text-h6 flex justify-between items-center">
        <span>Inventory ({{ usedSpace }}/{{ maxCapacity }})</span>
        <q-chip color="accent" outline>{{ weightDisplay }}</q-chip>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section class="inventory-container">
      <div v-if="loading" class="text-center q-pa-md">
        <q-spinner color="primary" size="2em" />
        <div class="q-mt-sm">Loading inventory...</div>
      </div>

      <div v-else-if="!hasItems" class="text-center text-grey q-pa-md">
        <q-icon name="inventory_2" size="2em" />
        <div class="q-mt-sm">Your inventory is empty</div>
        <div class="text-caption">Find items by searching buildings</div>
      </div>

      <div v-else>
        <!-- Item category tabs -->
        <q-tabs
          v-model="currentTab"
          dense
          class="text-grey"
          active-color="accent"
          indicator-color="accent"
          align="justify"
        >
          <q-tab name="all" label="All" />
          <q-tab name="weapons" label="Weapons" />
          <q-tab name="ammo" label="Ammo" />
          <q-tab name="medical" label="Medical" />
          <q-tab name="tools" label="Tools" />
        </q-tabs>

        <q-separator />

        <!-- Items list -->
        <q-list padding separator>
          <q-item
            v-for="item in filteredItems"
            :key="item.id"
            clickable
            v-ripple
            @click="openItemDetails(item)"
          >
            <q-item-section avatar>
              <q-icon :name="getItemIcon(item.type)" :color="getItemColor(item.type)" />
            </q-item-section>

            <q-item-section>
              <q-item-label>{{ item.name }}</q-item-label>
              <q-item-label caption>{{ item.description }}</q-item-label>
            </q-item-section>

            <q-item-section side v-if="item.quantity > 1">
              <q-chip dense size="sm">x{{ item.quantity }}</q-chip>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-card-section>
  </q-card>

  <!-- Item Details Dialog -->
  <q-dialog v-model="showItemDialog">
    <q-card class="item-details-dialog">
      <q-card-section class="row items-center">
        <div class="text-h6">{{ selectedItem?.name }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section v-if="selectedItem">
        <div class="row items-center q-mb-md">
          <q-icon
            :name="getItemIcon(selectedItem.type)"
            :color="getItemColor(selectedItem.type)"
            size="md"
            class="q-mr-md"
          />
          <div>
            <div class="text-subtitle1">{{ selectedItem.name }}</div>
            <div class="text-caption">
              {{ selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1) }} |
              {{ selectedItem.rarity.charAt(0).toUpperCase() + selectedItem.rarity.slice(1) }}
            </div>
          </div>
        </div>

        <q-separator class="q-mb-md" />

        <div class="text-body2 q-mb-md">{{ selectedItem.description }}</div>

        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-6" v-if="selectedItem.effects.damage">
            <div class="stat-item">
              <span class="text-caption">Damage:</span>
              <span class="text-negative">+{{ selectedItem.effects.damage }}</span>
            </div>
          </div>
          <div class="col-6" v-if="selectedItem.effects.healing">
            <div class="stat-item">
              <span class="text-caption">Healing:</span>
              <span class="text-positive">+{{ selectedItem.effects.healing }}</span>
            </div>
          </div>
          <div class="col-6" v-if="selectedItem.effects.accuracy">
            <div class="stat-item">
              <span class="text-caption">Accuracy:</span>
              <span>+{{ selectedItem.effects.accuracy }}%</span>
            </div>
          </div>
          <div class="col-6">
            <div class="stat-item">
              <span class="text-caption">Weight:</span>
              <span>{{ selectedItem.weight }} kg</span>
            </div>
          </div>
          <div class="col-6" v-if="selectedItem.quantity > 1">
            <div class="stat-item">
              <span class="text-caption">Quantity:</span>
              <span>{{ selectedItem.quantity }}</span>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          v-if="selectedItem?.usable"
          color="primary"
          label="Use"
          @click="useItem(selectedItem)"
          v-close-popup
        />
        <q-btn
          v-if="selectedItem && selectedItem.quantity > 0"
          color="accent"
          flat
          label="Drop One"
          @click="dropItem(selectedItem, 1)"
          v-close-popup
        />
        <q-btn
          v-if="selectedItem && selectedItem.quantity > 1"
          color="negative"
          flat
          label="Drop All"
          @click="dropItem(selectedItem, selectedItem?.quantity || 0)"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

// Define item type interfaces
interface ItemEffects {
  damage?: number;
  healing?: number;
  accuracy?: number;
  defense?: number;
}

interface InventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'ammo' | 'medical' | 'tool' | 'armor' | 'misc';
  description: string;
  effects: ItemEffects;
  usable: boolean;
  quantity: number;
  weight: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'unique';
}

// State
const loading = ref(false);
const items = ref<InventoryItem[]>([]);
const selectedItem = ref<InventoryItem | null>(null);
const currentTab = ref('all');
const maxCapacity = ref(10); // Mock max inventory capacity
const showItemDialog = ref(false);

// Mock data
const mockItems: InventoryItem[] = [
  {
    id: '1',
    name: 'Pistol',
    type: 'weapon',
    description: 'A standard 9mm handgun',
    effects: { damage: 5, accuracy: 15 },
    usable: false,
    quantity: 1,
    weight: 2,
    rarity: 'common'
  },
  {
    id: '2',
    name: 'Pistol Clip',
    type: 'ammo',
    description: 'Standard 9mm ammunition',
    effects: {},
    usable: false,
    quantity: 3,
    weight: 0.5,
    rarity: 'common'
  },
  {
    id: '3',
    name: 'First Aid Kit',
    type: 'medical',
    description: 'Restores 10 HP',
    effects: { healing: 10 },
    usable: true,
    quantity: 2,
    weight: 1,
    rarity: 'common'
  },
  {
    id: '4',
    name: 'Radio',
    type: 'tool',
    description: 'Used to communicate with other survivors',
    effects: {},
    usable: false,
    quantity: 1,
    weight: 1,
    rarity: 'uncommon'
  },
  {
    id: '5',
    name: 'Fire Axe',
    type: 'weapon',
    description: 'Heavy melee weapon',
    effects: { damage: 8 },
    usable: false,
    quantity: 1,
    weight: 3,
    rarity: 'uncommon'
  }
];

// Computed properties
const hasItems = computed(() => items.value.length > 0);

const filteredItems = computed(() => {
  if (currentTab.value === 'all') return items.value;

  return items.value.filter(item => {
    switch (currentTab.value) {
      case 'weapons': return item.type === 'weapon';
      case 'ammo': return item.type === 'ammo';
      case 'medical': return item.type === 'medical';
      case 'tools': return item.type === 'tool';
      default: return true;
    }
  });
});

const usedSpace = computed(() => {
  return items.value.length;
});

const totalWeight = computed(() => {
  return items.value.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
});

const weightDisplay = computed(() => {
  return `${totalWeight.value.toFixed(1)} kg`;
});

// Methods
function openItemDetails(item: InventoryItem) {
  selectedItem.value = item;
  showItemDialog.value = true;
}

function useItem(item: InventoryItem) {
  if (!item.usable) return;

  // Mock item usage behavior
  alert(`Used ${item.name}`);

  // Reduce quantity or remove item if last one
  if (item.quantity > 1) {
    item.quantity--;
  } else {
    items.value = items.value.filter(i => i.id !== item.id);
    selectedItem.value = null;
  }
}

function dropItem(item: InventoryItem, quantity: number) {
  if (quantity <= 0 || quantity > item.quantity) return;

  // Mock drop item behavior
  const confirmMsg = quantity === item.quantity
    ? `Drop all ${item.name}?`
    : `Drop ${quantity} ${item.name}?`;

  if (confirm(confirmMsg)) {
    if (quantity === item.quantity) {
      items.value = items.value.filter(i => i.id !== item.id);
      selectedItem.value = null;
    } else {
      item.quantity -= quantity;
    }
  }
}

function getItemIcon(type: string): string {
  switch (type) {
    case 'weapon': return 'gps_fixed';
    case 'ammo': return 'inventory';
    case 'medical': return 'healing';
    case 'tool': return 'handyman';
    case 'armor': return 'shield';
    default: return 'category';
  }
}

function getItemColor(type: string): string {
  switch (type) {
    case 'weapon': return 'negative';
    case 'ammo': return 'warning';
    case 'medical': return 'positive';
    case 'tool': return 'info';
    case 'armor': return 'secondary';
    default: return 'grey';
  }
}

// Lifecycle
onMounted(() => {
  loading.value = true;

  // Simulate API call
  setTimeout(() => {
    items.value = [...mockItems];
    loading.value = false;
  }, 500);
});
</script>

<style scoped>
.inventory-pane {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.inventory-container {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
}

.item-details-dialog {
  min-width: 350px;
  max-width: 500px;
  background-color: var(--md-card-background);
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 8px;
  background-color: var(--md-secondary);
  border-radius: 4px;
}

:deep(.q-tab__label) {
  font-size: 0.85rem;
}
</style>

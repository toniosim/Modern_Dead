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

    <!-- XP Management Section -->
    <q-card-section>
      <div class="text-subtitle1">XP Management</div>

      <div class="row q-col-gutter-sm q-my-sm">
        <div class="col-12 col-sm-6">
          <q-input v-model.number="xpAmount" type="number" label="XP Amount" min="1" />
        </div>
        <div class="col-12 col-sm-6">
          <div class="text-caption q-mb-xs">Current XP: {{ characterStore.getActiveCharacter?.experience || 0 }}</div>
          <div class="text-caption">Level: {{ characterStore.getActiveCharacter?.level || 1 }}</div>
        </div>
        <div class="col-12 flex justify-between q-mt-sm">
          <q-btn color="positive" label="Add XP" @click="addXP" :disable="!xpAmount || xpActionInProgress" />
          <q-btn color="primary" label="Set XP" @click="setXP" :disable="!xpAmount || xpActionInProgress" />
        </div>
      </div>

      <!-- XP Cost Info for Skills -->
      <div class="q-mt-md">
        <div class="text-caption text-weight-bold">XP Cost for Skills (by Category):</div>
        <q-list dense bordered>
          <q-item v-if="characterStore.getActiveCharacter?.xpCosts">
            <q-item-section>
              <div class="row q-col-gutter-md">
                <div class="col-6">
                  <div class="text-caption">Military: {{ characterStore.getActiveCharacter?.xpCosts?.military || 100 }}</div>
                  <div class="text-caption">Science: {{ characterStore.getActiveCharacter?.xpCosts?.science || 100 }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption">Civilian: {{ characterStore.getActiveCharacter?.xpCosts?.civilian || 100 }}</div>
                  <div class="text-caption">Zombie: {{ characterStore.getActiveCharacter?.xpCosts?.zombie || 100 }}</div>
                </div>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-card-section>

    <!-- Skill Management Section -->
    <q-card-section>
      <div class="text-subtitle1">Skill Management</div>

      <div class="row q-col-gutter-sm q-my-sm">
        <div class="col-12">
          <q-select
            v-model="selectedSkill"
            :options="availableSkills"
            label="Select Skill"
            option-label="name"
            option-value="name"
            emit-value
            map-options
            :loading="skillsLoading"
          >
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.name }}</q-item-label>
                  <q-item-label caption>
                    {{ scope.opt.category.charAt(0).toUpperCase() + scope.opt.category.slice(1) }}
                    - {{ getSkillXpCost(scope.opt.name) }} XP
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>
        <div class="col-12 flex justify-between q-mt-sm">
          <q-btn color="positive" label="Add Skill" @click="addSkill" :disable="!selectedSkill || skillActionInProgress" />
          <q-btn color="negative" label="Remove Skill" @click="removeSkill" :disable="!selectedSkill || skillActionInProgress" />
        </div>
      </div>

      <!-- Current Skills List -->
      <div class="q-mt-md">
        <div class="text-caption text-weight-bold">Current Skills:</div>
        <q-list dense bordered separator>
          <q-item v-for="skill in currentCharacterSkills" :key="skill.name">
            <q-item-section>
              <q-item-label>{{ skill.name }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-chip
                :color="skill.active ? 'positive' : 'grey-7'"
                text-color="white"
                size="sm"
              >
                {{ skill.active ? 'Active' : 'Inactive' }}
              </q-chip>
            </q-item-section>
          </q-item>
          <q-item v-if="currentCharacterSkills.length === 0">
            <q-item-section>
              <q-item-label class="text-italic text-grey-7">No skills</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
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
import { ref, computed, onMounted } from 'vue';
import { useCharacterStore } from 'src/stores/character-store';
import { useMapStore } from 'src/stores/map-store';
import { api } from 'src/boot/axios';

// Define types for skill categories
type SkillCategory = 'military' | 'science' | 'civilian' | 'zombie';
type XpCosts = Record<SkillCategory, number>;

interface Skill {
  name: string;
  category: SkillCategory;
}

// Store references
const characterStore = useCharacterStore();
const mapStore = useMapStore();

// AP Management state
const apAmount = ref(50);

// Teleport state
const teleportX = ref(0);
const teleportY = ref(0);

// Building search state
const selectedBuildingType = ref(null);
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

// Skill management state
const selectedSkill = ref(null);
const availableSkills = ref<Skill[]>([]);
const skillsLoading = ref(false);
const skillActionInProgress = ref(false);

// XP management state
const xpAmount = ref(100);
const xpActionInProgress = ref(false);

// Computed properties
const currentCharacterSkills = computed(() => {
  return characterStore.getActiveCharacter?.skills || [];
});

// Helper to get XP cost for a skill
const getSkillXpCost = (skillName: string) => {
  const activeCharacter = characterStore.getActiveCharacter;
  if (!activeCharacter || !activeCharacter.xpCosts) return 100;

  // Find the skill to determine its category
  const skill = availableSkills.value.find(s => s.name === skillName);
  if (!skill) return 100;

  // Return the XP cost based on character class and skill category
  const category = skill.category;
  return activeCharacter.xpCosts[category] || 100;
};

// AP Management methods
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

// Teleport method
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

// Building finder method
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

// Skill management methods
const fetchAvailableSkills = async () => {
  skillsLoading.value = true;
  try {
    // You can either fetch from a dedicated endpoint or use a hardcoded list
    // For this example, I'll use a hardcoded list of skills from the game
    availableSkills.value = [
      { name: 'Basic Firearms Training', category: 'military' },
      { name: 'Free Running', category: 'military' },
      { name: 'Pistol Training', category: 'military' },
      { name: 'Shotgun Training', category: 'military' },
      { name: 'Hand-to-Hand Combat', category: 'military' },
      { name: 'Axe Proficiency', category: 'military' },
      { name: 'First Aid', category: 'science' },
      { name: 'Diagnosis', category: 'science' },
      { name: 'Surgery', category: 'science' },
      { name: 'NecroTech Employment', category: 'science' },
      { name: 'Lab Experience', category: 'science' },
      { name: 'Construction', category: 'civilian' },
      { name: 'Shopping', category: 'civilian' },
      { name: 'Body Building', category: 'civilian' },
      { name: 'Tagging', category: 'civilian' },
      { name: 'Vigour Mortis', category: 'zombie' },
      { name: 'Lurching Gait', category: 'zombie' },
      { name: 'Death Grip', category: 'zombie' },
      { name: 'Scent Fear', category: 'zombie' },
      { name: 'Death Rattle', category: 'zombie' },
      { name: 'Memories of Life', category: 'zombie' }
    ];

    // Alternative: fetch from an API endpoint:
    /*
    const response = await api.get('/skills');
    availableSkills.value = response.data;
    */
  } catch (error) {
    console.error('Failed to fetch available skills:', error);
  } finally {
    skillsLoading.value = false;
  }
};

const addSkill = async () => {
  if (!characterStore.getActiveCharacter || !selectedSkill.value) return;

  skillActionInProgress.value = true;
  try {
    // Check if we have enough XP first
    const requiredXP = getSkillXpCost(selectedSkill.value);
    const currentXP = characterStore.getActiveCharacter.experience || 0;

    if (currentXP < requiredXP) {
      // If not enough XP, ask to add it automatically
      if (confirm(`Not enough XP. Need ${requiredXP} but have ${currentXP}. Add ${requiredXP - currentXP} XP automatically?`)) {
        // Add the needed XP
        await api.post('/debug/add-xp', {
          characterId: characterStore.getActiveCharacter._id,
          amount: requiredXP - currentXP + 5 // Add a little extra
        });

        // Refresh character data after adding XP
        await characterStore.getCharacter(characterStore.getActiveCharacter._id);
      } else {
        // User declined, abort
        return;
      }
    }

    // Add the skill via API
    await api.post(`/characters/${characterStore.getActiveCharacter._id}/skills`, {
      skillName: selectedSkill.value
    });

    // Refresh character data to show updated skills
    await characterStore.getCharacter(characterStore.getActiveCharacter._id);
  } catch (error: any) {
    console.error('Failed to add skill:', error);
    alert(error.response?.data?.message || 'Failed to add skill');
  } finally {
    skillActionInProgress.value = false;
  }
};

const removeSkill = async () => {
  if (!characterStore.getActiveCharacter || !selectedSkill.value) return;

  skillActionInProgress.value = true;
  try {
    // Use debug endpoint to remove the skill
    await api.post('/debug/remove-skill', {
      characterId: characterStore.getActiveCharacter._id,
      skillName: selectedSkill.value
    });

    // Refresh character data to show updated skills
    await characterStore.getCharacter(characterStore.getActiveCharacter._id);
  } catch (error) {
    console.error('Failed to remove skill:', error);
    alert('Failed to remove skill');
  } finally {
    skillActionInProgress.value = false;
  }
};

// XP Management methods
const addXP = async () => {
  if (!characterStore.getActiveCharacter || !xpAmount.value) return;

  xpActionInProgress.value = true;
  try {
// Add XP via API
    await api.post('/debug/add-xp', {
      characterId: characterStore.getActiveCharacter._id,
      amount: xpAmount.value
    });

// Refresh character data
    await characterStore.getCharacter(characterStore.getActiveCharacter._id);
  } catch (error) {
    console.error('Failed to add XP:', error);
    alert('Failed to add XP');
  } finally {
    xpActionInProgress.value = false;
  }
};

const setXP = async () => {
  if (!characterStore.getActiveCharacter || !xpAmount.value) return;

  xpActionInProgress.value = true;
  try {
// Set XP via API
    await api.post('/debug/set-xp', {
      characterId: characterStore.getActiveCharacter._id,
      amount: xpAmount.value
    });

// Refresh character data
    await characterStore.getCharacter(characterStore.getActiveCharacter._id);
  } catch (error) {
    console.error('Failed to set XP:', error);
    alert('Failed to set XP');
  } finally {
    xpActionInProgress.value = false;
  }
}

// Lifecycle hooks
onMounted(() => {
  fetchAvailableSkills();
});
</script>

<style scoped>
.debug-panel {
  background-color: rgba(33, 33, 33, 0.9);
  border: 2px solid var(--md-warning);
  max-width: 450px;
}
</style>

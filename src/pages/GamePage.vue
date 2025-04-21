<template>
  <q-page padding>
    <div v-if="characterStore.getActiveCharacter">
      <div class="row q-col-gutter-md">
        <!-- Character Status Panel -->
        <div class="col-12 col-md-4">
          <q-card class="character-status-card">
            <q-card-section>
              <div class="row items-center justify-between">
                <div>
                  <div class="text-h6">{{ characterStore.getActiveCharacter.name }}</div>
                  <div :class="getClassColor(characterStore.getActiveCharacter.classGroup)">
                    {{ getClassName(characterStore.getActiveCharacter) }}
                  </div>
                </div>
                <div>
                  <q-chip
                    :color="characterStore.getActiveCharacter.type === 'survivor' ? 'positive' : 'zombie'"
                    text-color="white"
                    size="md"
                  >
                    {{ characterStore.getActiveCharacter.type === 'survivor' ? 'Survivor' : 'Zombie' }}
                  </q-chip>
                </div>
              </div>
            </q-card-section>

            <q-separator />

            <q-card-section>
              <!-- Health Status -->
              <div class="status-box character-status status-hp q-pa-sm q-mb-md">
                <div class="flex justify-between">
                  <span>Health:</span>
                  <span :class="getHpStatusClass(characterStore.getActiveCharacter)">
                    {{ characterStore.getActiveCharacter.health.current }}/{{ characterStore.getActiveCharacter.health.max }}
                  </span>
                </div>
                <q-linear-progress
                  :value="characterStore.getActiveCharacter.health.current / characterStore.getActiveCharacter.health.max"
                  :color="getHpColor(characterStore.getActiveCharacter)"
                  class="q-mt-xs"
                />
              </div>

              <!-- AP Status -->
              <div class="status-box character-status status-ap q-pa-sm q-mb-md">
                <div class="flex justify-between">
                  <span>Action Points:</span>
                  <span :class="getApStatusClass(characterStore.getActiveCharacter)">
                    {{ characterStore.getActiveCharacter.actions.availableActions }}/50
                  </span>
                </div>
                <q-linear-progress
                  :value="characterStore.getActiveCharacter.actions.availableActions / 50"
                  color="info"
                  class="q-mt-xs"
                />
              </div>

              <!-- XP Status -->
              <div class="status-box character-status q-pa-sm q-mb-md">
                <div class="flex justify-between">
                  <span>Level:</span>
                  <span>{{ characterStore.getActiveCharacter.level }}</span>
                </div>
                <div class="flex justify-between">
                  <span>XP:</span>
                  <span>{{ characterStore.getActiveCharacter.experience }}</span>
                </div>
              </div>

              <!-- Infection Status (if applicable) -->
              <div v-if="characterStore.getActiveCharacter.infected" class="status-box character-status status-infection q-pa-sm q-mb-md">
                <div class="flex items-center">
                  <q-icon name="coronavirus" color="warning" class="q-mr-sm" />
                  <span class="text-warning">Infected</span>
                </div>
              </div>
            </q-card-section>

            <q-separator />

            <!-- Skills Section -->
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">Skills</div>
              <div v-if="activeSkills.length > 0">
                <div v-for="skill in activeSkills" :key="skill.name" class="skill-item q-mb-xs">
                  {{ skill.name }}
                </div>
              </div>
              <div v-else class="text-center text-grey q-pa-sm">
                No active skills
              </div>

              <div class="text-right q-mt-sm">
                <q-btn color="primary" label="View All Skills" flat size="sm" to="/skills" />
              </div>
            </q-card-section>

            <!-- Location Information -->
            <map-info />
          </q-card>
        </div>

        <!-- Map View Panel -->
        <div class="col-12 col-md-8">
          <q-card class="map-card">
            <q-card-section>
              <map-view />
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <div v-else-if="characterStore.loading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
      <div class="q-mt-sm">Loading character data...</div>
    </div>

    <div v-else class="text-center q-pa-xl">
      <q-icon name="error" size="3em" color="negative" />
      <div class="text-h6 q-mt-sm">No Active Character</div>
      <p class="text-grey-7">Please select or create a character to play.</p>
      <q-btn label="Character List" color="primary" to="/characters" class="q-mt-sm" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useCharacterStore, type Character, ClassGroup } from 'src/stores/character-store';
import MapView from 'components/map/MapView.vue';
import MapInfo from 'components/map/MapInfo.vue';

const characterStore = useCharacterStore();

// Load active character if available
onMounted(async () => {
  // If no active character, redirect to character list
  if (!characterStore.getActiveCharacter) {
    try {
      await characterStore.fetchUserCharacters();

      // If characters exist, set the first one as active
      if (characterStore.characters.length > 0) {
        characterStore.setActiveCharacter(characterStore.characters[0]._id);
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
    }
  }
});

// Computed properties
const activeSkills = computed(() => {
  if (!characterStore.getActiveCharacter) return [];

  return characterStore.getActiveCharacter.skills
    .filter(skill => skill.active)
    .slice(0, 5); // Show only the first 5 active skills
});

// Helper methods
function getClassName(character: Character) {
  if (character.classGroup && character.subClass) {
    const classGroup = character.classGroup as ClassGroup;
    if (classGroup in characterStore.classDefinitions) {
      const subClassDef = characterStore.classDefinitions[classGroup];
      if (character.subClass in subClassDef) {
        return subClassDef[character.subClass].name || 'Unknown Class';
      }
    }
  }
  return 'Unknown Class';
}

function getClassColor(classGroup: string) {
  switch (classGroup) {
    case 'MILITARY':
      return 'military';
    case 'CIVILIAN':
      return 'civilian';
    case 'SCIENTIST':
      return 'scientist';
    case 'ZOMBIE':
      return 'zombie';
    default:
      return '';
  }
}

function getHpStatusClass(character: Character) {
  const hpPercentage = (character.health.current / character.health.max) * 100;

  if (hpPercentage <= 25) {
    return 'hp-critical';
  } else if (hpPercentage <= 50) {
    return 'hp-injured';
  } else {
    return 'hp-healthy';
  }
}

function getHpColor(character: Character) {
  const hpPercentage = (character.health.current / character.health.max) * 100;

  if (hpPercentage <= 25) {
    return 'negative';
  } else if (hpPercentage <= 50) {
    return 'warning';
  } else {
    return 'positive';
  }
}

function getApStatusClass(character: Character) {
  if (character.actions.availableActions <= 10) {
    return 'ap-low';
  } else {
    return 'ap-available';
  }
}
</script>

<style scoped>
.character-status-card, .map-card {
  height: 100%;
}

.skill-item {
  padding: 4px 8px;
  background-color: var(--md-secondary);
  border-left: 3px solid var(--md-accent);
  border-radius: 2px;
}
</style>

<!-- src/pages/CharacterDetailPage.vue -->
<template>
  <q-page padding>
    <div class="row justify-center">
      <div class="col-12 col-md-8 col-lg-6">
        <q-card class="character-detail-card q-pa-md">
          <q-card-section v-if="loading" class="text-center">
            <q-spinner color="primary" size="3em" />
            <div class="q-mt-sm">Loading character data...</div>
          </q-card-section>

          <template v-else-if="character">
            <!-- Character Header -->
            <q-card-section>
              <div class="row items-center justify-between">
                <div>
                  <div class="text-h5">{{ character.name }}</div>
                  <div :class="getClassColor(character.classGroup)">
                    {{ getClassName(character) }}
                  </div>
                </div>
                <div>
                  <q-chip
                    :color="character.type === 'survivor' ? 'positive' : 'zombie'"
                    text-color="white"
                    size="md"
                  >
                    {{ character.type === 'survivor' ? 'Survivor' : 'Zombie' }}
                  </q-chip>
                </div>
              </div>
            </q-card-section>

            <q-separator />

            <!-- Stats Section -->
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">Stats</div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <div class="character-stat-box q-pa-sm">
                    <div class="flex justify-between">
                      <span>Level:</span>
                      <span>{{ character.level }}</span>
                    </div>
                  </div>
                </div>
                <div class="col-12 col-sm-6">
                  <div class="character-stat-box q-pa-sm">
                    <div class="flex justify-between">
                      <span>XP:</span>
                      <span>{{ character.experience }}</span>
                    </div>
                  </div>
                </div>

                <div v-if="character.type === 'survivor'" class="col-12 col-sm-6">
                  <div class="character-stat-box q-pa-sm">
                    <div class="flex justify-between">
                      <span>HP:</span>
                      <span :class="getHpStatusClass(character)">
                        {{ character.health.current }}/{{ character.health.max }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="col-12 col-sm-6">
                  <div class="character-stat-box q-pa-sm">
                    <div class="flex justify-between">
                      <span>AP:</span>
                      <span>{{ character.actions.availableActions }}/50</span>
                    </div>
                  </div>
                </div>

                <div v-if="character.infected" class="col-12">
                  <div class="character-stat-box infection-box q-pa-sm">
                    <div class="flex items-center">
                      <q-icon name="coronavirus" color="warning" class="q-mr-xs" />
                      <span>Infected</span>
                    </div>
                  </div>
                </div>
              </div>
            </q-card-section>

            <!-- Location Section -->
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">Location</div>
              <div class="character-stat-box q-pa-sm">
                <div class="flex justify-between">
                  <span>Area:</span>
                  <span>{{ character.location.areaName }}</span>
                </div>
                <div class="flex justify-between q-mt-xs">
                  <span>Coordinates:</span>
                  <span>[{{ character.location.x }}, {{ character.location.y }}]</span>
                </div>
              </div>
            </q-card-section>

            <!-- Skills Section -->
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">Skills</div>

              <div v-if="character.skills.length === 0" class="text-center text-grey q-pa-md">
                No skills learned yet.
              </div>

              <div v-else>
                <q-list bordered separator>
                  <q-item v-for="skill in character.skills" :key="skill.name">
                    <q-item-section>
                      <q-item-label>{{ skill.name }}</q-item-label>
                      <q-item-label caption>
                        {{ getSkillDescription(skill.name) }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-chip
                        :color="skill.active ? 'positive' : 'grey'"
                        size="sm"
                        text-color="white"
                      >
                        {{ skill.active ? 'Active' : 'Inactive' }}
                      </q-chip>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
            </q-card-section>

            <!-- Inventory Section -->
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">Inventory</div>

              <div v-if="character.inventory.length === 0" class="text-center text-grey q-pa-md">
                Inventory is empty.
              </div>

              <div v-else>
                <q-list bordered separator>
                  <q-item v-for="(item, index) in character.inventory" :key="index">
                    <q-item-section>
                      <q-item-label>{{ getItemName(item.item) }}</q-item-label>
                    </q-item-section>
                    <q-item-section side v-if="item.quantity > 1">
                      <q-chip size="sm">{{ item.quantity }}</q-chip>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
            </q-card-section>

            <!-- Actions Section -->
            <q-card-actions align="right">
              <q-btn
                v-if="character.type === 'survivor'"
                flat
                color="negative"
                label="Die"
                @click="confirmStateChange('dead')"
              />
              <q-btn
                v-else
                flat
                color="positive"
                label="Revive"
                @click="confirmStateChange('alive')"
              />
              <q-btn flat color="primary" label="Play" @click="playCharacter" />
            </q-card-actions>
          </template>

          <q-card-section v-else class="text-center">
            <q-icon name="error" size="3em" color="negative" />
            <div class="text-h6 q-mt-sm">Character Not Found</div>
            <p class="text-grey-7">The character you're looking for does not exist.</p>
            <q-btn label="Back to Characters" color="primary" to="/characters" class="q-mt-sm" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Confirmation Dialog -->
    <q-dialog v-model="stateChangeDialog">
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar :icon="stateChangeTarget === 'alive' ? 'healing' : 'dangerous'"
                    :color="stateChangeTarget === 'alive' ? 'positive' : 'negative'"
                    text-color="white" />
          <span class="q-ml-sm">
            {{ stateChangeTarget === 'alive' ? 'Revive this character?' : 'Kill this character?' }}
          </span>
        </q-card-section>

        <q-card-section>
          <p v-if="stateChangeTarget === 'alive'">
            This will revive your zombie character, converting it back to a survivor.
          </p>
          <p v-else>
            This will kill your survivor character, converting it to a zombie.
          </p>
          <p>This action cannot be undone directly.</p>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            :label="stateChangeTarget === 'alive' ? 'Revive' : 'Die'"
            :color="stateChangeTarget === 'alive' ? 'positive' : 'negative'"
            @click="changeCharacterState"
            :loading="stateChangeLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Error Dialog -->
    <q-dialog v-model="errorDialog">
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="error" color="negative" text-color="white" />
          <span class="q-ml-sm">{{ errorMessage }}</span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCharacterStore, type Character, type ClassGroup } from 'src/stores/character-store';

const route = useRoute();
const router = useRouter();
const characterStore = useCharacterStore();

// State
const loading = ref(true);
const stateChangeDialog = ref(false);
const stateChangeTarget = ref<'alive' | 'dead'>('alive');
const stateChangeLoading = ref(false);
const errorDialog = ref(false);
const errorMessage = ref('');

// Get character ID from route parameters
const characterId = computed(() => route.params.id as string);

// Computed properties
const character = computed(() => characterStore.getActiveCharacter);

// Skill descriptions (for a real app, this would come from the backend)
const skillDescriptions: Record<string, string> = {
  'Basic Firearms Training': '+25% to hit with firearms attacks',
  'Free Running': 'Move between adjacent buildings without going outside',
  'First Aid': 'Heal with First Aid Kits (heals additional 5 HP)',
  'Axe Proficiency': '+10% to hit with axes',
  'Shopping': 'Choose which stores to search in malls',
  'NecroTech Employment': 'Operate DNA Extractors and identify NecroTech buildings',
  'Diagnosis': 'Identify injured survivors by HP level',
  'Vigour Mortis': '+10% to hit with non-weapon attacks',
  // Add more as needed
};

// Helper methods
const getClassName = (character: Character) => {
  if (character.classGroup && character.subClass) {
    const classGroup = character.classGroup as ClassGroup;
    if (classGroup in characterStore.classDefinitions) {
      const subClassDef = characterStore.classDefinitions[classGroup];
      if (character.subClass in subClassDef) {
        const classInfo = subClassDef[character.subClass];
        return classInfo?.name || 'Unknown Class';
      }
    }
  }
  return 'Unknown Class';
};

const getClassColor = (classGroup: string) => {
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
};

const getHpStatusClass = (character: Character) => {
  const hpPercentage = (character.health.current / character.health.max) * 100;

  if (hpPercentage <= 25) {
    return 'hp-critical';
  } else if (hpPercentage <= 50) {
    return 'hp-injured';
  } else {
    return 'hp-healthy';
  }
};

const getSkillDescription = (skillName: string) => {
  return skillDescriptions[skillName] || 'No description available';
};

const getItemName = (itemId: string) => {
  // In a real app, this would look up item details from a store or API
  // For now, we'll return a placeholder
  return 'Item #' + itemId.substring(0, 8);
};

// Action methods
const playCharacter = () => {
  router.push('/game');
};

const confirmStateChange = (newState: 'alive' | 'dead') => {
  stateChangeTarget.value = newState;
  stateChangeDialog.value = true;
};

const changeCharacterState = async () => {
  if (!characterId.value) return;

  stateChangeLoading.value = true;

  try {
    await characterStore.updateCharacterState(
      characterId.value,
      stateChangeTarget.value
    );
    stateChangeDialog.value = false;
  } catch (error: any) {
    errorMessage.value = error || 'Failed to change character state';
    errorDialog.value = true;
  } finally {
    stateChangeLoading.value = false;
  }
};

// Load character on mount
onMounted(async () => {
  try {
    await characterStore.getCharacter(characterId.value);
  } catch (error: any) {
    errorMessage.value = error || 'Failed to load character';
    errorDialog.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.character-detail-card {
  width: 100%;
}

.character-stat-box {
  border: 1px solid var(--md-accent);
  border-radius: 4px;
  background-color: var(--md-primary);
}

.infection-box {
  border-left: 3px solid var(--md-warning);
}
</style>

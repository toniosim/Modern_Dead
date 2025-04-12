<!-- src/pages/CharacterListPage.vue -->
<template>
  <q-page padding>
    <div class="row justify-center">
      <div class="col-12 col-lg-8">
        <q-card class="character-list-card q-pa-md">
          <q-card-section>
            <div class="row items-center justify-between">
              <div class="text-h5">Your Characters</div>
              <q-btn
                v-if="canCreateCharacter"
                label="Create Character"
                color="primary"
                to="/characters/create"
                icon="add"
              />
            </div>

            <div v-if="loading" class="text-center q-pa-md">
              <q-spinner color="primary" size="3em" />
              <div class="q-mt-sm">Loading characters...</div>
            </div>

            <div v-else-if="!hasCharacters" class="text-center q-pa-md">
              <q-icon name="person_add" size="3em" color="grey-7" />
              <div class="text-h6 q-mt-sm">No Characters Found</div>
              <p class="text-grey-7">Create your first character to start playing.</p>
              <q-btn
                label="Create Character"
                color="primary"
                to="/characters/create"
                icon="add"
                class="q-mt-sm"
              />
            </div>

            <div v-else>
              <!-- Survivor Characters Section -->
              <div v-if="survivorCharacters.length > 0" class="q-mb-lg">
                <div class="text-subtitle1 q-mb-sm">Survivors</div>
                <div class="row q-col-gutter-md">
                  <div
                    v-for="character in survivorCharacters"
                    :key="character._id"
                    class="col-12 col-sm-6"
                  >
                    <q-card class="character-card" bordered>
                      <q-card-section>
                        <div class="row items-center no-wrap">
                          <div class="col">
                            <div class="text-h6">{{ character.name }}</div>
                            <div :class="getClassColor(character.classGroup)">
                              {{ getClassName(character) }}
                            </div>
                          </div>
                          <div class="col-auto">
                            <q-icon
                              name="person"
                              :color="character.infected ? 'warning' : 'positive'"
                              size="2rem"
                            />
                          </div>
                        </div>
                      </q-card-section>

                      <q-separator />

                      <q-card-section>
                        <div class="row q-gutter-xs">
                          <div class="col-12">
                            <div class="flex justify-between">
                              <span>HP:</span>
                              <span :class="getHpStatusClass(character)">
                                {{ character.health.current }}/{{ character.health.max }}
                              </span>
                            </div>
                          </div>
                          <div class="col-12">
                            <div class="flex justify-between">
                              <span>Level:</span>
                              <span>{{ character.level }}</span>
                            </div>
                          </div>
                          <div class="col-12">
                            <div class="flex justify-between">
                              <span>Location:</span>
                              <span>{{ character.location.areaName }}</span>
                            </div>
                          </div>
                        </div>
                      </q-card-section>

                      <q-card-actions align="right">
                        <q-btn
                          flat
                          color="negative"
                          label="Die"
                          @click="confirmStateChange(character._id, 'dead')"
                        />
                        <q-btn
                          flat
                          color="primary"
                          label="Play"
                          @click="selectCharacter(character._id)"
                        />
                      </q-card-actions>
                    </q-card>
                  </div>
                </div>
              </div>

              <!-- Zombie Characters Section -->
              <div v-if="zombieCharacters.length > 0">
                <div class="text-subtitle1 q-mb-sm">Zombies</div>
                <div class="row q-col-gutter-md">
                  <div
                    v-for="character in zombieCharacters"
                    :key="character._id"
                    class="col-12 col-sm-6"
                  >
                    <q-card class="character-card zombie-card" bordered>
                      <q-card-section>
                        <div class="row items-center no-wrap">
                          <div class="col">
                            <div class="text-h6">{{ character.name }}</div>
                            <div class="zombie">Zombie ({{ getClassName(character) }})</div>
                          </div>
                          <div class="col-auto">
                            <q-icon name="face" color="zombie" size="2rem" />
                          </div>
                        </div>
                      </q-card-section>

                      <q-separator />

                      <q-card-section>
                        <div class="row q-gutter-xs">
                          <div class="col-12">
                            <div class="flex justify-between">
                              <span>Level:</span>
                              <span>{{ character.level }}</span>
                            </div>
                          </div>
                          <div class="col-12">
                            <div class="flex justify-between">
                              <span>Location:</span>
                              <span>{{ character.location.areaName }}</span>
                            </div>
                          </div>
                        </div>
                      </q-card-section>

                      <q-card-actions align="right">
                        <q-btn
                          flat
                          color="positive"
                          label="Revive"
                          @click="confirmStateChange(character._id, 'alive')"
                        />
                        <q-btn
                          flat
                          color="primary"
                          label="Play"
                          @click="selectCharacter(character._id)"
                        />
                      </q-card-actions>
                    </q-card>
                  </div>
                </div>
              </div>
            </div>
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
import { useRouter } from 'vue-router';
import {useCharacterStore, type Character, ClassGroup} from 'src/stores/character-store';

const router = useRouter();
const characterStore = useCharacterStore();

// State
const loading = ref(true);
const stateChangeDialog = ref(false);
const stateChangeCharacterId = ref('');
const stateChangeTarget = ref<'alive' | 'dead'>('alive');
const stateChangeLoading = ref(false);
const errorDialog = ref(false);
const errorMessage = ref('');

// Computed properties
const hasCharacters = computed(() => characterStore.hasCharacters);
const survivorCharacters = computed(() => characterStore.getCharactersByType('survivor'));
const zombieCharacters = computed(() => characterStore.getCharactersByType('zombie'));
const canCreateCharacter = computed(() => characterStore.characters.length < 3);

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

// Action methods
const selectCharacter = (characterId: string) => {
  characterStore.setActiveCharacter(characterId);
  router.push('/game');
};

const confirmStateChange = (characterId: string, newState: 'alive' | 'dead') => {
  stateChangeCharacterId.value = characterId;
  stateChangeTarget.value = newState;
  stateChangeDialog.value = true;
};

const changeCharacterState = async () => {
  if (!stateChangeCharacterId.value) return;

  stateChangeLoading.value = true;

  try {
    await characterStore.updateCharacterState(
      stateChangeCharacterId.value,
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

// Load characters on mount
onMounted(async () => {
  try {
    await characterStore.fetchUserCharacters();
  } catch (error: any) {
    errorMessage.value = error || 'Failed to load characters';
    errorDialog.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.character-list-card {
  width: 100%;
}

.character-card {
  transition: all 0.2s ease;
}

.character-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.zombie-card {
  background-color: var(--md-dark-building);
  border-color: var(--md-zombie);
}
</style>

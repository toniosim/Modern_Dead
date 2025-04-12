<!-- src/pages/CharacterCreationPage.vue -->
<template>
  <q-page padding>
    <div class="row justify-center">
      <div class="col-12 col-md-8 col-lg-6">
        <q-card class="character-creation-card q-pa-md">
          <q-card-section>
            <div class="text-h5 q-mb-md">Create Character</div>

            <q-form @submit="onSubmit" class="q-gutter-md">
              <!-- Character Name -->
              <q-input
                v-model="name"
                label="Character Name"
                :rules="[
                  val => !!val || 'Name is required',
                  val => val.length >= 2 || 'Name must be at least 2 characters',
                  val => val.length <= 30 || 'Name must be at most 30 characters'
                ]"
              />

              <!-- Class Group Selection -->
              <div>
                <div class="text-subtitle1 q-mb-sm">Select Character Class</div>
                <q-option-group
                  v-model="classGroup"
                  :options="classGroupOptions"
                  color="primary"
                  type="radio"
                  @update:model-value="resetSubClass"
                />
              </div>

              <!-- SubClass Selection -->
              <div v-if="classGroup">
                <div class="text-subtitle1 q-mb-sm">Select Specialization</div>
                <q-option-group
                  v-model="subClass"
                  :options="subClassOptions"
                  color="primary"
                  type="radio"
                />
              </div>

              <!-- Class Preview -->
              <div v-if="classGroup && subClass" class="q-mt-lg">
                <q-card bordered flat class="selected-class-preview">
                  <q-card-section>
                    <div class="text-h6">{{ selectedClass?.name }}</div>
                    <div class="text-subtitle2 q-mb-md">{{ selectedClass?.description }}</div>

                    <div class="text-weight-bold">Starting Skills:</div>
                    <ul>
                      <li v-for="skill in selectedClass?.startingSkills" :key="skill">
                        {{ skill }}
                      </li>
                    </ul>

                    <div class="text-weight-bold">Starting Equipment:</div>
                    <ul>
                      <li v-for="item in selectedClass?.startingEquipment" :key="item.item">
                        {{ item.item }} <span v-if="item.quantity > 1">({{ item.quantity }})</span>
                      </li>
                    </ul>

                    <div v-if="classGroup === 'ZOMBIE'" class="warning-box q-pa-sm q-mt-md">
                      <q-icon name="warning" color="warning" class="q-mr-sm" />
                      <span>Note: You will start as a zombie and need to be revived to become a survivor.</span>
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <div class="q-mt-md">
                <q-btn
                  label="Back"
                  type="button"
                  color="secondary"
                  flat
                  to="/characters"
                  class="q-mr-sm"
                />
                <q-btn
                  label="Create Character"
                  type="submit"
                  color="primary"
                  :loading="loading"
                  :disable="!canSubmit"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Error dialog -->
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
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCharacterStore } from 'src/stores/character-store';

const router = useRouter();
const characterStore = useCharacterStore();

// Define valid class groups as a type
type ClassGroup = 'MILITARY' | 'CIVILIAN' | 'SCIENTIST' | 'ZOMBIE';

// Form state
const name = ref('');
const classGroup = ref<ClassGroup | ''>('');
const subClass = ref('');
const loading = ref(false);

// Error handling
const errorDialog = ref(false);
const errorMessage = ref('');

// Class options
const classGroupOptions = [
  { label: 'Military', value: 'MILITARY' as ClassGroup },
  { label: 'Civilian', value: 'CIVILIAN' as ClassGroup },
  { label: 'Scientist', value: 'SCIENTIST' as ClassGroup },
  { label: 'Zombie', value: 'ZOMBIE' as ClassGroup }
];

// Dynamic subclass options based on selected class group
const subClassOptions = computed(() => {
  if (!classGroup.value || !(classGroup.value in characterStore.classDefinitions)) {
    return [];
  }

  const group = characterStore.classDefinitions[classGroup.value as ClassGroup];
  return Object.keys(group).map(key => {
    const subClass = group[key];
    return {
      label: subClass?.name || key,
      value: key
    };
  });
});

// Selected class details for preview
const selectedClass = computed(() => {
  if (!classGroup.value || !subClass.value) {
    return null;
  }

  return characterStore.classDefinitions[classGroup.value as ClassGroup]?.[subClass.value];
});

// Reset subclass when class group changes
const resetSubClass = () => {
  subClass.value = '';
};

// Validation check
const canSubmit = computed(() => {
  return name.value.length >= 2 && name.value.length <= 30 && classGroup.value && subClass.value;
});

// Form submission
const onSubmit = async () => {
  if (!canSubmit.value) return;

  loading.value = true;

  try {
    await characterStore.createCharacter({
      name: name.value,
      classGroup: classGroup.value as ClassGroup,
      subClass: subClass.value
    });

    // Redirect to character list
    router.push('/characters');
  } catch (error: any) {
    errorMessage.value = error || 'Failed to create character. Please try again.';
    errorDialog.value = true;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.character-creation-card {
  width: 100%;
}

.selected-class-preview {
  background-color: var(--md-card-background);
}

.warning-box {
  background-color: rgba(242, 192, 55, 0.2);
  border-left: 3px solid var(--md-warning);
}
</style>

<template>
  <q-page padding>
    <div class="row justify-center">
      <div class="col-12 col-md-8 col-lg-6">
        <q-card class="profile-card q-pa-md">
          <q-card-section>
            <div class="text-h5 q-mb-md">User Profile</div>

            <div v-if="loading" class="text-center">
              <q-spinner color="primary" size="3em" />
              <div class="q-mt-sm">Loading profile data...</div>
            </div>

            <div v-else-if="error" class="text-negative">
              {{ error }}
            </div>

            <div v-else-if="profile">
              <div class="row q-mb-md">
                <div class="col-12 col-sm-4 text-weight-bold">Username:</div>
                <div class="col-12 col-sm-8">{{ profile.username }}</div>
              </div>

              <div class="row q-mb-md">
                <div class="col-12 col-sm-4 text-weight-bold">Email:</div>
                <div class="col-12 col-sm-8">{{ profile.email }}</div>
              </div>

              <div class="row q-mb-md">
                <div class="col-12 col-sm-4 text-weight-bold">User ID:</div>
                <div class="col-12 col-sm-8">{{ profile.userId }}</div>
              </div>

              <div class="row q-mb-md">
                <div class="col-12 col-sm-4 text-weight-bold">Role:</div>
                <div class="col-12 col-sm-8">{{ profile.role }}</div>
              </div>

              <div class="row q-mb-md">
                <div class="col-12 col-sm-4 text-weight-bold">Last Active:</div>
                <div class="col-12 col-sm-8">{{ formatDate(profile.lastActive) }}</div>
              </div>

              <div class="row q-mb-md">
                <div class="col-12 col-sm-4 text-weight-bold">Created:</div>
                <div class="col-12 col-sm-8">{{ formatDate(profile.createdAt) }}</div>
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn
              label="Logout"
              color="negative"
              @click="logout"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from 'src/stores/user-store';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(true);
const error = ref<string | null>(null);
const profile = ref<any>(null);

// Format date for display
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

// Logout handler
const logout = () => {
  userStore.logout();
  router.push('/login');
};

// Load profile data
onMounted(async () => {
  try {
    profile.value = await userStore.fetchUserProfile();
  } catch (err: any) {
    error.value = err || 'Failed to load profile data';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.profile-card {
  width: 100%;
}
</style>

<template>
  <q-page class="flex flex-center">
    <q-card class="auth-card q-pa-lg">
      <q-card-section>
        <div class="text-h5 q-mb-md">Login</div>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-input
            v-model="email"
            label="Email"
            type="email"
            :rules="[val => !!val || 'Email is required', isValidEmail]"
          />

          <q-input
            v-model="password"
            label="Password"
            :type="isPwd ? 'password' : 'text'"
            :rules="[val => !!val || 'Password is required']"
          >
            <template v-slot:append>
              <q-icon
                :name="isPwd ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="isPwd = !isPwd"
              />
            </template>
          </q-input>

          <div class="flex justify-between">
            <q-btn label="Register" color="secondary" flat to="/register" />
            <q-btn label="Login" type="submit" color="primary" :loading="loading" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>

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
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from 'src/stores/user-store';

const router = useRouter();
const userStore = useUserStore();

// Form state
const email = ref('');
const password = ref('');
const isPwd = ref(true);
const loading = ref(false);

// Error handling
const errorDialog = ref(false);
const errorMessage = ref('');

// Email validation
const isValidEmail = (val: string) => {
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailPattern.test(val) || 'Invalid email address';
};

// Form submission
const onSubmit = async () => {
  loading.value = true;

  try {
    await userStore.login({ email: email.value, password: password.value });
    router.push('/'); // Redirect to home after login
  } catch (error: any) {
    errorMessage.value = error || 'Login failed. Please try again.';
    errorDialog.value = true;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.auth-card {
  width: 100%;
  max-width: 400px;
}
</style>

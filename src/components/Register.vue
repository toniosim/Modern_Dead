<template>
  <q-page class="flex flex-center">
    <q-card class="auth-card q-pa-lg">
      <q-card-section>
        <div class="text-h5 q-mb-md">Register</div>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-input
            v-model="username"
            label="Username"
            :rules="[
              val => !!val || 'Username is required',
              val => val.length >= 3 || 'Username must be at least 3 characters'
            ]"
          />

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
            :rules="[
              val => !!val || 'Password is required',
              val => val.length >= 6 || 'Password must be at least 6 characters'
            ]"
          >
            <template v-slot:append>
              <q-icon
                :name="isPwd ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="isPwd = !isPwd"
              />
            </template>
          </q-input>

          <q-input
            v-model="confirmPassword"
            label="Confirm Password"
            :type="isPwd ? 'password' : 'text'"
            :rules="[
              val => !!val || 'Please confirm your password',
              val => val === password || 'Passwords do not match'
            ]"
          />

          <div class="flex justify-between">
            <q-btn label="Already have an account?" color="secondary" flat to="/login" />
            <q-btn label="Register" type="submit" color="primary" :loading="loading" />
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

    <!-- Success dialog -->
    <q-dialog v-model="successDialog">
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="check_circle" color="positive" text-color="white" />
          <span class="q-ml-sm">Registration successful! You can now log in.</span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Login" color="primary" v-close-popup @click="router.push('/login')" />
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
const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const isPwd = ref(true);
const loading = ref(false);

// Dialog state
const errorDialog = ref(false);
const errorMessage = ref('');
const successDialog = ref(false);

// Email validation
const isValidEmail = (val: string) => {
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailPattern.test(val) || 'Invalid email address';
};

// Form submission
const onSubmit = async () => {
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match';
    errorDialog.value = true;
    return;
  }

  loading.value = true;

  try {
    await userStore.register({
      username: username.value,
      email: email.value,
      password: password.value
    });

    // Show success message
    successDialog.value = true;

    // Reset form
    username.value = '';
    email.value = '';
    password.value = '';
    confirmPassword.value = '';
  } catch (error: any) {
    errorMessage.value = error || 'Registration failed. Please try again.';
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

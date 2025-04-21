<template>
  <q-card class="connection-test q-pa-md">
    <q-card-section>
      <div class="text-h6">Backend Connection Test</div>
    </q-card-section>

    <q-card-section>
      <p>Test the connection between your Quasar frontend and Express backend.</p>

      <q-btn
        color="primary"
        label="Test Connection"
        @click="testConnection"
        :loading="loading"
      />

      <div class="response-box q-mt-md" v-if="response">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2">Server Response:</div>
            <pre>{{ JSON.stringify(response, null, 2) }}</pre>
          </q-card-section>
        </q-card>
      </div>

      <div class="error-box q-mt-md" v-if="error">
        <q-card flat bordered class="bg-red-1">
          <q-card-section>
            <div class="text-subtitle2 text-negative">Error:</div>
            <p>{{ error }}</p>
          </q-card-section>
        </q-card>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { api } from 'src/boot/axios';

const loading = ref(false);
const response = ref(null);
const error = ref('');

const testConnection = async () => {
  loading.value = true;
  error.value = '';
  response.value = null;

  try {
    const result = await api.get('/test/ping');
    response.value = result.data;
  } catch (err: any) {
    console.error('Connection test failed:', err);
    error.value = err?.response?.data?.message || err?.message || 'Failed to connect to the backend server';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.connection-test {
  max-width: 600px;
}

.response-box pre {
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}
</style>

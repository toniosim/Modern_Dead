<template>
  <q-card class="database-test q-pa-md">
    <q-card-section>
      <div class="text-h6">Database Connection Test</div>
    </q-card-section>

    <q-card-section>
      <p>Test the connection to MongoDB database.</p>

      <q-btn
        color="primary"
        label="Test Database Connection"
        @click="testDatabaseConnection"
        :loading="loading"
      />

      <div class="response-box q-mt-md" v-if="response">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2">Database Response:</div>
            <div class="q-pa-md">
              <div class="row q-mb-sm">
                <div class="col-4 text-weight-bold">Connection Status:</div>
                <div class="col-8 text-positive" v-if="response.connected">Connected</div>
                <div class="col-8 text-negative" v-else>Disconnected</div>
              </div>
              <div class="row q-mb-sm" v-if="response.connected">
                <div class="col-4 text-weight-bold">Database Name:</div>
                <div class="col-8">{{ response.databaseName }}</div>
              </div>
              <div class="row q-mb-sm" v-if="response.connected">
                <div class="col-4 text-weight-bold">MongoDB Version:</div>
                <div class="col-8">{{ response.version }}</div>
              </div>
              <div class="row q-mb-sm" v-if="response.collections && response.collections.length">
                <div class="col-4 text-weight-bold">Collections:</div>
                <div class="col-8">
                  <div v-for="(collection, index) in response.collections" :key="index">
                    {{ collection }}
                  </div>
                </div>
              </div>
            </div>
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
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const loading = ref(false);
const response = ref(null);
const error = ref('');

const testDatabaseConnection = async () => {
  loading.value = true;
  error.value = '';
  response.value = null;

  try {
    const result = await axios.get(`${API_URL}/test/db-connection`);
    response.value = result.data;
  } catch (err) {
    console.error('Database connection test failed:', err);
    error.value = err instanceof Error
      ? err.message
      : 'Failed to test database connection';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.database-test {
  max-width: 600px;
}

.response-box pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}
</style>

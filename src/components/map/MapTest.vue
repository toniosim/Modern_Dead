<template>
  <q-card class="map-test q-pa-md">
    <q-card-section>
      <div class="text-h6">Map System Test</div>
      <p>Test the map generation and movement system.</p>

      <q-btn
        color="primary"
        label="Test Map Generation"
        @click="testMapGeneration"
        :loading="loading"
        class="q-mb-md"
      />

      <div v-if="mapStats" class="map-stats q-mt-md">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2">Map Statistics:</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <div class="stat-item">
                  <span class="text-weight-bold">Total Map Cells:</span> {{ mapStats.mapCells }}
                </div>
              </div>
              <div class="col-12 col-sm-6">
                <div class="stat-item">
                  <span class="text-weight-bold">Total Buildings:</span> {{ mapStats.buildings }}
                </div>
              </div>
              <div class="col-12 col-sm-6">
                <div class="stat-item">
                  <span class="text-weight-bold">Streets:</span> {{ mapStats.streets }}
                </div>
              </div>
              <div class="col-12 col-sm-6">
                <div class="stat-item">
                  <span class="text-weight-bold">Building Percentage:</span> {{ mapStats.buildingPercentage.toFixed(2) }}%
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div v-if="sampleBuildings.length > 0" class="sample-buildings q-mt-md">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2">Sample Buildings:</div>
            <q-list>
              <q-item v-for="building in sampleBuildings" :key="building._id">
                <q-item-section>
                  <q-item-label>{{ building.name }}</q-item-label>
                  <q-item-label caption>
                    Type: {{ building.type }} |
                    Location: [{{ building.location.x }}, {{ building.location.y }}] |
                    Barricade: {{ building.barricadeLevel }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <div v-if="error" class="error-box q-mt-md">
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

<script setup>
import { ref } from 'vue';
import { api } from 'src/boot/axios';

const loading = ref(false);
const error = ref('');
const mapStats = ref(null);
const sampleBuildings = ref([]);

const testMapGeneration = async () => {
  loading.value = true;
  error.value = '';
  mapStats.value = null;
  sampleBuildings.value = [];

  try {
    // Test map generation
    const result = await api.get('/api/test/map-generation');

    // Set map stats
    mapStats.value = {
      mapCells: result.data.mapCells,
      buildings: result.data.buildings,
      streets: result.data.mapCells - result.data.buildings,
      buildingPercentage: (result.data.buildings / result.data.mapCells) * 100
    };

    // Get sample buildings
    const buildingsResult = await api.get('/api/test/sample-buildings');
    sampleBuildings.value = buildingsResult.data.buildings;
  } catch (err) {
    console.error('Map test failed:', err);
    error.value = err instanceof Error
      ? err.message
      : 'Failed to test map generation';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.map-test {
  max-width: 800px;
}

.stat-item {
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.stat-item:last-child {
  border-bottom: none;
}
</style>

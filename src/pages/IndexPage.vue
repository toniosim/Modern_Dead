<template>
  <q-page class="row items-center justify-evenly">
    <div class="col-12">
      <div class="row q-col-gutter-md">
        <!-- Backend Connection Test Component -->
        <div class="col-12 col-md-6 q-pa-md">
          <connection-test />
        </div>

        <!-- Socket.io Test Component -->
        <div class="col-12 col-md-6 q-pa-md">
          <socket-test />
        </div>
      </div>
    </div>

    <!-- Database Test Component -->
    <div class="col-12 col-md-4 q-pa-md">
      <database-test />
    </div>

  </q-page>
</template>

<script setup lang="ts">
  import ConnectionTest from 'components/ConnectionTest.vue';
  import SocketTest from 'components/SocketTest.vue';
  import DatabaseTest from 'components/DatabaseTest.vue';
</script>

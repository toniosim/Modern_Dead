<template>
  <q-page class="row items-center justify-evenly">
    <!-- Game UI Demo Component -->
    <div class="col-12 col-lg-8 q-mb-lg">
      <game-ui-demo />
    </div>

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

    <!-- Example Component (keep the original component) -->
    <div class="col-12 col-md-6 q-mb-md">
      <example-component
        title="Example component"
        active
        :todos="todos"
        :meta="meta"
      ></example-component>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Todo, Meta } from 'components/models';
import ExampleComponent from 'components/ExampleComponent.vue';
import ConnectionTest from 'components/ConnectionTest.vue';
import SocketTest from 'components/SocketTest.vue';
import GameUiDemo from 'components/GameUiDemo.vue'; // Import our new component

const todos = ref<Todo[]>([
  {
    id: 1,
    content: 'ct1'
  },
  {
    id: 2,
    content: 'ct2'
  },
  {
    id: 3,
    content: 'ct3'
  },
  {
    id: 4,
    content: 'ct4'
  },
  {
    id: 5,
    content: 'ct5'
  }
]);

const meta = ref<Meta>({
  totalCount: 1200
});
</script>

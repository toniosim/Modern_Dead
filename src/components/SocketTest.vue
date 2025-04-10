<template>
  <q-card class="socket-test q-pa-md">
    <q-card-section>
      <div class="text-h6">Socket.io Connection Test</div>
    </q-card-section>

    <q-card-section>
      <q-btn
        color="primary"
        :label="connected ? 'Connected' : 'Connect'"
        @click="toggleConnection"
        :loading="connecting"
        :disable="connected"
      />

      <q-btn
        class="q-ml-sm"
        color="secondary"
        label="Send Test Message"
        @click="sendTestMessage"
        :disable="!connected"
      />

      <div class="events-box q-mt-md">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2">Socket Events:</div>
            <div v-for="(event, index) in events" :key="index" class="event-item">
              <span class="text-bold">{{ event.type }}:</span> {{ event.data }}
              <div class="text-caption">{{ event.time }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import socketService from '../services/socket.service.js';

const connected = ref(false);
const connecting = ref(false);
const events = ref([]);

const toggleConnection = () => {
  if (connected.value) {
    socketService.disconnect();
  } else {
    connecting.value = true;
    socketService.initialize();
  }
};

const sendTestMessage = () => {
  socketService.socket.emit('test_event', { message: 'Hello from client!' });
  addEvent('sent', 'Test message sent to server');
};

const addEvent = (type, data) => {
  events.value.unshift({
    type,
    data: typeof data === 'object' ? JSON.stringify(data) : data,
    time: new Date().toLocaleTimeString()
  });

  // Keep only the last 10 events
  if (events.value.length > 10) {
    events.value.pop();
  }
};

onMounted(() => {
  // Listen for socket connection events
  socketService.on('connect', () => {
    connected.value = true;
    connecting.value = false;
    addEvent('connection', 'Connected to server');
  });

  socketService.on('disconnect', () => {
    connected.value = false;
    addEvent('connection', 'Disconnected from server');
  });

  // Listen for test response
  socketService.on('test_response', (data) => {
    addEvent('received', data);
  });

  // Initialize if not already connected
  if (!socketService.connected) {
    connecting.value = true;
    socketService.initialize();
  } else {
    connected.value = true;
  }
});

onUnmounted(() => {
  // Clean up listeners
  socketService.socket.off('connect');
  socketService.socket.off('disconnect');
  socketService.socket.off('test_response');
});
</script>

<style scoped>
.socket-test {
  max-width: 600px;
}

.event-item {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.event-item:last-child {
  border-bottom: none;
}
</style>

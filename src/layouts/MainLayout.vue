<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title class="text-bold">
          Modern Dead
        </q-toolbar-title>

        <div v-if="userStore.isAuthenticated" class="q-mr-md">
          Welcome, <span :class="userClass">{{ userStore.getUsername }}</span>
        </div>

        <!-- Auth buttons -->
        <q-btn v-if="userStore.isAuthenticated"
               flat dense round
               icon="account_circle"
               aria-label="Profile"
        >
          <q-menu>
            <q-list style="min-width: 100px">
              <q-item clickable v-close-popup to="/profile">
                <q-item-section>Profile</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="logout">
                <q-item-section>Logout</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>

        <q-btn v-else to="/login" flat label="Login" class="ud-button" />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="ud-drawer"
    >
      <div class="q-pa-md">
        <div class="text-h6 q-mb-md">Modern Dead</div>
        <div class="text-caption q-mb-lg">A modern remake of Urban Dead</div>
      </div>

      <q-list>
        <q-item-label header>
          Navigation
        </q-item-label>

        <q-item clickable to="/">
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>Home</q-item-section>
        </q-item>

        <q-item v-if="userStore.isAuthenticated" clickable to="/game">
          <q-item-section avatar>
            <q-icon name="videogame_asset" />
          </q-item-section>
          <q-item-section>Play Game</q-item-section>
        </q-item>

        <q-item v-if="userStore.isAuthenticated" clickable to="/map">
          <q-item-section avatar>
            <q-icon name="map" />
          </q-item-section>
          <q-item-section>Map</q-item-section>
        </q-item>

        <q-item clickable to="/game-ui-demo">
          <q-item-section avatar>
            <q-icon name="gamepad" />
          </q-item-section>
          <q-item-section>Game UI Demo</q-item-section>

        </q-item>

        <q-item v-if="userStore.isAuthenticated" clickable to="/profile">
          <q-item-section avatar>
            <q-icon name="account_circle" />
          </q-item-section>
          <q-item-section>Profile</q-item-section>
        </q-item>

        <q-item v-if="!userStore.isAuthenticated" clickable to="/login">
          <q-item-section avatar>
            <q-icon name="login" />
          </q-item-section>
          <q-item-section>Login</q-item-section>
        </q-item>

        <q-item v-if="!userStore.isAuthenticated" clickable to="/register">
          <q-item-section avatar>
            <q-icon name="person_add" />
          </q-item-section>
          <q-item-section>Register</q-item-section>
        </q-item>

        <q-item v-if="userStore.isAuthenticated" clickable @click="logout">
          <q-item-section avatar>
            <q-icon name="logout" />
          </q-item-section>
          <q-item-section>Logout</q-item-section>
        </q-item>

        <q-separator class="q-my-md" />

        <!-- Game Info Section -->
        <q-item-label header>
          Game Info
        </q-item-label>

        <q-item clickable to="/skills">
          <q-item-section avatar>
            <q-icon name="psychology" />
          </q-item-section>
          <q-item-section>Skills</q-item-section>
        </q-item>

        <q-item clickable to="/buildings">
          <q-item-section avatar>
            <q-icon name="apartment" />
          </q-item-section>
          <q-item-section>Buildings</q-item-section>
        </q-item>

        <q-item clickable to="/classes">
          <q-item-section avatar>
            <q-icon name="groups" />
          </q-item-section>
          <q-item-section>Character Classes</q-item-section>
        </q-item>

        <q-separator class="q-my-md" />

        <!-- Stats Section -->
        <q-item-label header>
          Game Stats
        </q-item-label>

        <q-item v-if="userStore.isAuthenticated">
          <q-item-section>
            <div class="text-subtitle2">Character Stats</div>
            <div class="flex justify-between">
              <span>HP:</span>
              <span class="hp-healthy">50/50</span>
            </div>
            <div class="flex justify-between">
              <span>AP:</span>
              <span class="ap-available">42/50</span>
            </div>
            <div class="flex justify-between">
              <span>XP:</span>
              <span>325</span>
            </div>
            <div class="flex justify-between">
              <span>Level:</span>
              <span>8</span>
            </div>
          </q-item-section>
        </q-item>

        <q-separator class="q-my-md" />

        <!-- About Links Section -->
        <q-item-label header>
          About
        </q-item-label>

        <q-item clickable tag="a" href="https://wiki.urbandead.com/" target="_blank">
          <q-item-section avatar>
            <q-icon name="insert_drive_file" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Urban Dead Wiki</q-item-label>
            <q-item-label caption>Learn about the original game</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable tag="a" href="https://github.com/quasarframework" target="_blank">
          <q-item-section avatar>
            <q-icon name="code" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Quasar Framework</q-item-label>
            <q-item-label caption>github.com/quasarframework</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from 'src/stores/user-store';

const router = useRouter();
const userStore = useUserStore();

const leftDrawerOpen = ref(false);

// Determine the user's class for styling
const userClass = ref('civilian'); // Default to civilian

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function logout() {
  userStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.ud-drawer {
  background-color: var(--md-card-background);
}
</style>

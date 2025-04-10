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

        <q-toolbar-title>
          Modern Dead
        </q-toolbar-title>

        <div v-if="userStore.isAuthenticated" class="q-mr-md">
          Welcome, {{ userStore.getUsername }}
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

        <q-btn v-else to="/login" flat label="Login" />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
    >
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

        <q-separator />

        <!-- Keep the original links section -->
        <q-item-label header>
          Essential Links
        </q-item-label>

        <EssentialLink
          v-for="link in linksList"
          :key="link.title"
          v-bind="link"
        />
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
import EssentialLink, { type EssentialLinkProps } from 'components/EssentialLink.vue';
import { useUserStore } from 'src/stores/user-store';

const router = useRouter();
const userStore = useUserStore();

const linksList: EssentialLinkProps[] = [
  {
    title: 'Docs',
    caption: 'quasar.dev',
    icon: 'school',
    link: 'https://quasar.dev'
  },
  {
    title: 'Github',
    caption: 'github.com/quasarframework',
    icon: 'code',
    link: 'https://github.com/quasarframework'
  },
  {
    title: 'Discord Chat Channel',
    caption: 'chat.quasar.dev',
    icon: 'chat',
    link: 'https://chat.quasar.dev'
  },
  {
    title: 'Forum',
    caption: 'forum.quasar.dev',
    icon: 'record_voice_over',
    link: 'https://forum.quasar.dev'
  },
  {
    title: 'Twitter',
    caption: '@quasarframework',
    icon: 'rss_feed',
    link: 'https://twitter.quasar.dev'
  },
  {
    title: 'Facebook',
    caption: '@QuasarFramework',
    icon: 'public',
    link: 'https://facebook.quasar.dev'
  },
  {
    title: 'Quasar Awesome',
    caption: 'Community Quasar projects',
    icon: 'favorite',
    link: 'https://awesome.quasar.dev'
  }
];

const leftDrawerOpen = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function logout() {
  userStore.logout();
  router.push('/login');
}
</script>

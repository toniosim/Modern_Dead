import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/IndexPage.vue')
      },
      {
        path: 'profile',
        component: () => import('pages/ProfilePage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'game',
        component: () => import('pages/GamePage.vue'),
        meta: { requiresAuth: true }
      }
    ],
  },

  // Auth routes
  {
    path: '/login',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      { path: '', component: () => import('pages/auth/Login.vue') }
    ],
    meta: { guest: true }
  },
  {
    path: '/register',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      { path: '', component: () => import('pages/auth/Register.vue') }
    ],
    meta: { guest: true }
  },

  {
    path:'/game-ui-demo',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/GameUIDemoPage.vue') }
    ],
    meta: { requiresAuth: false }
  },

  {
    path: '/characters',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/CharacterListPage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'create',
        component: () => import('pages/CharacterCreationPage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: ':id',
        component: () => import('pages/CharacterDetailPage.vue'),
        meta: { requiresAuth: true }
      }
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;

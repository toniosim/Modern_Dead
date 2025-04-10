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

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;

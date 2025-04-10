import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';
import { useUserStore } from 'src/stores/user-store';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory);

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  // Navigation guards
  Router.beforeEach((to, from, next) => {
    const userStore = useUserStore();
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const isGuestOnly = to.matched.some(record => record.meta.guest);

    // Check if the route requires authentication
    if (requiresAuth && !userStore.isAuthenticated) {
      next('/login'); // Redirect to login if not authenticated
    }
    // Check if the route is for guests only (like login/register)
    else if (isGuestOnly && userStore.isAuthenticated) {
      next('/'); // Redirect authenticated users away from login/register pages
    }
    else {
      next(); // Proceed as normal
    }
  });

  return Router;
});

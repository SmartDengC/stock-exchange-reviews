import type { Router } from 'vue-router';

import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';
import { startProgress, stopProgress } from '@vben/utils';

import { accessRoutes } from '#/router/routes';
import { useAuthStore } from '#/store';

import { generateAccess } from './access';

const LOGIN_PATH = '/login';

function createRouterGuard(router: Router) {
  const loadedPaths = new Set<string>();

  router.beforeEach(async (to) => {
    if (!loadedPaths.has(to.path) && preferences.transition.progress) {
      startProgress();
    }

    const authStore = useAuthStore();

    if (to.path === LOGIN_PATH) {
      const loggedIn = await authStore.ensureSession();
      if (loggedIn) return String(to.query.returnTo || '/');
      return true;
    }

    const loggedIn = await authStore.ensureSession();
    if (!loggedIn) {
      return {
        path: LOGIN_PATH,
        query: to.fullPath === '/' ? {} : { returnTo: to.fullPath },
        replace: true,
      };
    }

    const accessStore = useAccessStore();
    if (!accessStore.isAccessChecked) {
      const { accessibleMenus, accessibleRoutes } = await generateAccess({
        roles: ['user'],
        router,
        routes: accessRoutes,
      });
      accessStore.setAccessMenus(accessibleMenus);
      accessStore.setAccessRoutes(accessibleRoutes);
      accessStore.setIsAccessChecked(true);
      return { ...router.resolve(to.fullPath), replace: true };
    }

    return true;
  });

  router.afterEach((to) => {
    loadedPaths.add(to.path);
    document.title = `${String(to.meta.title || '市场日记')} · 市场日记`;
    if (preferences.transition.progress) stopProgress();
  });

  router.onError(() => {
    if (preferences.transition.progress) stopProgress();
  });
}

export { createRouterGuard };

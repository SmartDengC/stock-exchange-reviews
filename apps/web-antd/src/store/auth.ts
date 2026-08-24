import type { SessionUser } from '#/shared/types/auth';

import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccessStore, useUserStore } from '@vben/stores';

import { defineStore } from 'pinia';

import {
  ApiError,
  fetchSession as fetchSessionApi,
  login as loginApi,
  logout as logoutApi,
  sessionUser,
} from '#/api';

const LOGIN_PATH = '/login';

export const useAuthStore = defineStore('market-diary-auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();
  const route = useRoute();

  const currentUser = ref<null | SessionUser>(null);
  const ready = ref(false);
  const loginLoading = ref(false);

  const loggedIn = computed(() => Boolean(currentUser.value));

  function applyUser(user: null | SessionUser) {
    currentUser.value = user;
    accessStore.setAccessToken(user ? 'cookie-session' : null);
    userStore.setUserInfo(
      user
        ? {
            avatar: '/favicon.svg',
            realName: user.username,
            roles: ['user'],
            userId: user.username,
            username: user.username,
          }
        : null,
    );
  }

  function clearSession() {
    applyUser(null);
    accessStore.setAccessCodes([]);
    accessStore.setAccessMenus([]);
    accessStore.setAccessRoutes([]);
    accessStore.setIsAccessChecked(false);
    accessStore.setLoginExpired(false);
  }

  async function ensureSession(force = false) {
    if (ready.value && !force) return loggedIn.value;
    try {
      const response = await fetchSessionApi();
      applyUser(sessionUser(response));
    } catch (error) {
      clearSession();
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
    } finally {
      ready.value = true;
    }
    return loggedIn.value;
  }

  async function authLogin(
    credentials: { password: string; username: string },
    onSuccess?: () => Promise<void> | void,
  ) {
    loginLoading.value = true;
    try {
      const response = await loginApi(credentials);
      applyUser(sessionUser(response));
      ready.value = true;
      if (onSuccess) {
        await onSuccess();
      } else {
        const returnTo = String(route.query.returnTo || '/');
        await router.replace(returnTo);
      }
      return response;
    } finally {
      loginLoading.value = false;
    }
  }

  async function logout(redirect = true) {
    try {
      if (loggedIn.value) await logoutApi();
    } finally {
      clearSession();
      ready.value = true;
      if (redirect) await router.replace(LOGIN_PATH);
    }
  }

  async function expireSession() {
    const returnTo = router.currentRoute.value.fullPath;
    clearSession();
    ready.value = true;
    if (router.currentRoute.value.path !== LOGIN_PATH) {
      await router.replace({
        path: LOGIN_PATH,
        query: { returnTo },
      });
    }
  }

  function $reset() {
    clearSession();
    currentUser.value = null;
    ready.value = false;
    loginLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    currentUser,
    ensureSession,
    expireSession,
    loggedIn,
    loginLoading,
    logout,
    ready,
  };
});

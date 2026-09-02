import type { SessionUser } from '#/shared/types/auth';

import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccessStore, useUserStore } from '@vben/stores';

import { Modal } from 'ant-design-vue';
import { defineStore } from 'pinia';

import {
  ApiError,
  fetchSession as fetchSessionApi,
  login as loginApi,
  logout as logoutApi,
  sessionUser,
} from '#/api';

/** 登录页路径 */
const LOGIN_PATH = '/login';

/**
 * 认证状态管理 Store（Pinia）
 * 管理用户登录状态、会话检查和认证流程
 * 
 * 核心状态：
 * - currentUser: 当前登录用户信息
 * - ready: 会话检查是否完成
 * - loginLoading: 登录请求是否正在进行
 * 
 * 与 Vben 集成：
 * - 通过 accessStore 管理访问令牌
 * - 通过 userStore 管理用户信息
 */
export const useAuthStore = defineStore('market-diary-auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();
  const route = useRoute();

  /** 当前登录用户信息，未登录时为 null */
  const currentUser = ref<null | SessionUser>(null);
  
  /** 会话检查是否已完成，用于避免重复检查 */
  const ready = ref(false);
  
  /** 登录请求是否正在进行中 */
  const loginLoading = ref(false);

  /** 防止多个并发请求重复弹出会话过期提示 */
  let sessionExpiryPromptOpen = false;

  /** 是否已登录（计算属性） */
  const loggedIn = computed(() => Boolean(currentUser.value));

  /**
   * 应用用户信息到 Store 和 Vben
   * 同步更新 currentUser、accessToken 和 userStore
   * @param user 用户信息，null 表示登出
   */
  function applyUser(user: null | SessionUser) {
    currentUser.value = user;
    // 设置访问令牌类型（cookie-session 表示使用 Cookie 认证）
    accessStore.setAccessToken(user ? 'cookie-session' : null);
    // 同步用户信息到 Vben userStore
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

  /**
   * 清除会话状态
   * 清除用户信息、访问权限和菜单
   */
  function clearSession() {
    applyUser(null);
    accessStore.setAccessCodes([]);
    accessStore.setAccessMenus([]);
    accessStore.setAccessRoutes([]);
    accessStore.setIsAccessChecked(false);
    accessStore.setLoginExpired(false);
  }

  /**
   * 确保会话有效（路由守卫调用）
   * 检查当前登录状态，必要时从后端刷新
   * @param force 是否强制刷新会话
   * @returns 是否已登录
   * @note ready 为 true 时不重复检查，除非 force 为 true
   */
  async function ensureSession(force = false) {
    // 如果已准备好且非强制刷新，直接返回当前状态
    if (ready.value && !force) return loggedIn.value;
    try {
      const response = await fetchSessionApi();
      applyUser(sessionUser(response));
    } catch (error) {
      clearSession();
      // 401 错误表示未登录，静默处理；其他错误抛出
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
    } finally {
      ready.value = true;
    }
    return loggedIn.value;
  }

  /**
   * 用户登录
   * @param credentials 登录凭证
   * @param credentials.username 用户名
   * @param credentials.password 密码
   * @param onSuccess 登录成功后的回调函数
   * @returns 会话响应
   * @note 成功后自动跳转到 returnTo 参数指定的页面，或默认首页
   */
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
        // 跳转到登录前访问的页面，或默认首页
        const returnTo = String(route.query.returnTo || '/');
        await router.replace(returnTo);
      }
      return response;
    } finally {
      loginLoading.value = false;
    }
  }

  /**
   * 用户登出
   * @param redirect 是否跳转到登录页，默认 true
   * @note 先调用后端登出 API，然后清除本地状态
   */
  async function logout(redirect = true) {
    try {
      if (loggedIn.value) await logoutApi();
    } finally {
      clearSession();
      ready.value = true;
      if (redirect) await router.replace(LOGIN_PATH);
    }
  }

  /**
   * 会话过期处理
   * 用于处理 401 响应，保存当前页面并提示用户重新登录
   * @note 用户确认后跳转到登录页，登录后自动返回
   */
  async function expireSession() {
    const returnTo = router.currentRoute.value.fullPath;
    clearSession();
    ready.value = true;
    // 如果不在登录页，提示用户确认后再跳转，避免并发 401 重复弹窗
    if (router.currentRoute.value.path === LOGIN_PATH || sessionExpiryPromptOpen) return;

    sessionExpiryPromptOpen = true;
    Modal.info({
      title: '会话已过期',
      content: '登录会话已过期，请重新登录。',
      okText: '确定',
      closable: false,
      onOk: async () => {
        sessionExpiryPromptOpen = false;
        await router.replace({
          path: LOGIN_PATH,
          query: { returnTo },
        });
      },
    });
  }

  /**
   * 重置 Store 状态
   * 用于开发环境热更新或测试
   */
  function $reset() {
    clearSession();
    currentUser.value = null;
    ready.value = false;
    loginLoading.value = false;
    sessionExpiryPromptOpen = false;
  }

  return {
    $reset,
    authLogin,
    clearSession,
    currentUser,
    ensureSession,
    expireSession,
    loggedIn,
    loginLoading,
    logout,
    ready,
  };
});

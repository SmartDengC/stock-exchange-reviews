import type { Router } from 'vue-router';

import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';
import { startProgress, stopProgress } from '@vben/utils';

import { accessRoutes } from '#/router/routes';
import { useAuthStore } from '#/store';

import { generateAccess } from './access';

/** 登录页路径 */
const LOGIN_PATH = '/login';

/**
 * 创建路由守卫
 * 处理登录验证、权限检查和页面加载进度
 * 
 * 守卫流程：
 * 1. beforeEach: 检查登录状态，未登录跳转到登录页
 * 2. 首次访问时生成可访问路由和菜单
 * 3. afterEach: 更新页面标题，停止加载进度
 * 4. onError: 路由错误时停止加载进度
 * 
 * @param router Vue Router 实例
 */
function createRouterGuard(router: Router) {
  /** 已加载的路径集合，用于控制进度条显示 */
  const loadedPaths = new Set<string>();

  /**
   * 全局前置守卫
   * 每个路由跳转前执行，用于登录验证和权限检查
   */
  router.beforeEach(async (to) => {
    // 如果路径未加载过且启用了进度条，开始显示进度
    if (!loadedPaths.has(to.path) && preferences.transition.progress) {
      startProgress();
    }

    const authStore = useAuthStore();

    // 访问登录页时的特殊处理
    if (to.path === LOGIN_PATH) {
      const loggedIn = await authStore.ensureSession();
      // 如果已登录，跳转到 returnTo 指定的页面或首页
      if (loggedIn) return String(to.query.returnTo || '/');
      return true;
    }

    // 检查登录状态
    const loggedIn = await authStore.ensureSession();
    if (!loggedIn) {
      // 未登录，跳转到登录页，记录当前页面到 returnTo
      return {
        path: LOGIN_PATH,
        query: to.fullPath === '/' ? {} : { returnTo: to.fullPath },
        replace: true,
      };
    }

    const accessStore = useAccessStore();
    // 首次访问，生成可访问路由和菜单
    if (!accessStore.isAccessChecked) {
      const { accessibleMenus, accessibleRoutes } = await generateAccess({
        roles: ['user'],
        router,
        routes: accessRoutes,
      });
      accessStore.setAccessMenus(accessibleMenus);
      accessStore.setAccessRoutes(accessibleRoutes);
      accessStore.setIsAccessChecked(true);
      // 重新解析路由，确保动态添加的路由已生效
      return { ...router.resolve(to.fullPath), replace: true };
    }

    return true;
  });

  /**
   * 全局后置守卫
   * 路由跳转成功后执行，用于更新页面标题和停止进度条
   */
  router.afterEach((to) => {
    loadedPaths.add(to.path);
    // 更新页面标题
    document.title = `${String(to.meta.title || '市场日记')} · 市场日记`;
    // 停止加载进度条
    if (preferences.transition.progress) stopProgress();
  });

  /**
   * 路由错误处理
   * 路由跳转失败时执行，停止进度条
   */
  router.onError(() => {
    if (preferences.transition.progress) stopProgress();
  });
}

export { createRouterGuard };

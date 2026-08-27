import { createApp, watchEffect } from 'vue';

import { registerAccessDirective } from '@vben/access';
import { registerLoadingDirective } from '@vben/common-ui/es/loading';
import { preferences } from '@vben/preferences';
import { initStores } from '@vben/stores';
import '@vben/styles';
import '@vben/styles/antd';

import { useTitle } from '@vueuse/core';

import { $t, setupI18n } from '#/locales';

import { initComponentAdapter } from './adapter/component';
import { initSetupVbenForm } from './adapter/form';
import { postLogoutBeacon, setUnauthorizedHandler } from './api';
import App from './app.vue';
import { router } from './router';
import { useAuthStore } from './store';

import './styles/market-diary.css';

async function bootstrap(namespace: string) {
  // 初始化组件适配器
  await initComponentAdapter();

  // 初始化表单组件
  await initSetupVbenForm();

  // // 设置弹窗的默认配置
  // setDefaultModalProps({
  //   fullscreenButton: false,
  // });
  // // 设置抽屉的默认配置
  // setDefaultDrawerProps({
  //   zIndex: 1020,
  // });

  const app = createApp(App);

  // 注册v-loading指令
  registerLoadingDirective(app, {
    loading: 'loading', // 在这里可以自定义指令名称，也可以明确提供false表示不注册这个指令
    spinning: 'spinning',
  });

  // 国际化 i18n 配置
  await setupI18n(app);

  // 配置 pinia-tore
  await initStores(app, { namespace });

  // 安装权限指令
  registerAccessDirective(app);

  // 初始化 tippy
  const { initTippy } = await import('@vben/common-ui/es/tippy');
  initTippy(app);

  // 配置路由及路由守卫
  app.use(router);

  setUnauthorizedHandler(async () => {
    await useAuthStore().expireSession();
  });

  // 配置Motion插件
  const { MotionPlugin } = await import('@vben/plugins/motion');
  app.use(MotionPlugin);

  // 动态更新标题
  watchEffect(() => {
    if (preferences.app.dynamicTitle) {
      const routeTitle = router.currentRoute.value.meta?.title;
      const pageTitle =
        (routeTitle ? `${$t(routeTitle)} - ` : '') + preferences.app.name;
      useTitle(pageTitle);
    }
  });

  app.mount('#app');

  // 页面关闭时自动登出
  setupAutoLogout();
}

/**
 * 注册页面关闭时的自动登出逻辑。
 * 使用 navigator.sendBeacon（同步排队，浏览器保证发出）
 * 搭配 pagehide 事件，确保关闭标签页/窗口时登出请求可靠到达后端。
 */
function setupAutoLogout() {
  let pending = false;

  function triggerLogout() {
    if (pending) return;
    const authStore = useAuthStore();
    if (!authStore.loggedIn) return;
    pending = true;
    // sendBeacon 同步排队请求后立即返回，浏览器保证发出
    postLogoutBeacon();
    // 立即清除本地状态
    authStore.clearSession();
  }

  // pagehide 在标签页/窗口关闭、刷新时触发
  window.addEventListener('pagehide', () => {
    triggerLogout();
  });
}

export { bootstrap };

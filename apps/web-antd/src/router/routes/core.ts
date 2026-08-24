import type { RouteRecordRaw } from 'vue-router';

const BasicLayout = () => import('#/layouts/basic.vue');
const AuthPageLayout = () => import('#/layouts/auth.vue');

const fallbackNotFoundRoute: RouteRecordRaw = {
  component: () => import('#/views/_core/fallback/not-found.vue'),
  meta: {
    hideInBreadcrumb: true,
    hideInMenu: true,
    hideInTab: true,
    title: '页面未找到',
  },
  name: 'FallbackNotFound',
  path: '/:path(.*)*',
};

const coreRoutes: RouteRecordRaw[] = [
  {
    children: [],
    component: BasicLayout,
    meta: { hideInBreadcrumb: true, title: '市场日记' },
    name: 'Root',
    path: '/',
  },
  {
    children: [
      {
        component: () => import('#/views/auth/login.vue'),
        meta: { hideInTab: true, title: '登录' },
        name: 'Login',
        path: '',
      },
    ],
    component: AuthPageLayout,
    meta: { hideInMenu: true, hideInTab: true, title: '登录' },
    name: 'Authentication',
    path: '/login',
  },
  {
    name: 'LegacyTradingLogin',
    path: '/trading/login',
    redirect: '/login',
  },
];

export { coreRoutes, fallbackNotFoundRoute };

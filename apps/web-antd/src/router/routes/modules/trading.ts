import type { RouteRecordRaw } from 'vue-router';

import { currentTradingDate } from '#/lib/trading';

const routes: RouteRecordRaw[] = [
  {
    children: [
      {
        component: () => import('#/views/trading/rules.vue'),
        meta: { icon: 'lucide:book-open-check', title: '交易规则' },
        name: 'TradingRules',
        path: '/trading/rules',
      },
      {
        component: () => import('#/views/trading/overview.vue'),
        // fullPathKey: false 让布局以 path 作为组件 key，
        // 页面把 tradeId/日期筛选同步进 query 时不会重挂载组件、丢失弹窗状态。
        meta: { fullPathKey: false, icon: 'lucide:gauge', title: '交易总览' },
        name: 'TradingOverview',
        path: '/trading',
      },
      {
        component: () => import('#/views/trading/trades.vue'),
        // 同上：tradeId / 筛选 / 分页的 query 变化不应触发整页重建。
        meta: { fullPathKey: false, icon: 'lucide:list-ordered', title: '交易记录' },
        name: 'Trades',
        path: '/trading/trades',
      },
      {
        meta: { icon: 'lucide:notebook-pen', title: '每日复盘' },
        name: 'DailyReviewShortcut',
        path: '/trading/daily',
        redirect: () => `/trading/daily/${currentTradingDate()}`,
      },
      {
        component: () => import('#/views/trading/daily-review.vue'),
        meta: { hideInMenu: true, title: '每日复盘' },
        name: 'DailyReview',
        path: '/trading/daily/:date',
      },
      {
        component: () => import('#/views/trading/analytics.vue'),
        meta: { fullPathKey: false, icon: 'lucide:chart-spline', title: '统计洞察' },
        name: 'TradingAnalytics',
        path: '/trading/analytics',
      },
      {
        component: () => import('#/views/trading/options.vue'),
        meta: { hideInMenu: true, icon: 'lucide:book-text', title: '录入字段' },
        name: 'TradingOptions',
        path: '/trading/options',
      },
      {
        component: () => import('#/views/trading/settings.vue'),
        meta: { hideInMenu: true, icon: 'lucide:settings-2', title: '设置与导出' },
        name: 'TradingSettings',
        path: '/trading/settings',
      },
    ],
    meta: {
      icon: 'lucide:candlestick-chart',
      order: 2,
      title: '交易复盘',
    },
    name: 'Trading',
    path: '/trading-root',
    redirect: '/trading',
  },
];

export default routes;

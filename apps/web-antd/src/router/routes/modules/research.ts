import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    children: [
      {
        component: () => import('#/views/research/overview.vue'),
        meta: { icon: 'lucide:layout-dashboard', title: '复盘总览' },
        name: 'ResearchOverview',
        path: '/',
      },
      {
        component: () => import('#/views/research/weekly.vue'),
        meta: { fullPathKey: false, icon: 'lucide:calendar-range', title: '周复盘' },
        name: 'WeeklyReviews',
        path: '/research/weekly',
      },
      {
        component: () => import('#/views/research/daily.vue'),
        meta: { fullPathKey: false, icon: 'lucide:notebook-tabs', title: '日复盘' },
        name: 'DailyReviews',
        path: '/research/daily',
      },
      {
        component: () => import('#/views/research/report.vue'),
        meta: {
          breadcrumbParents: [{ path: '/research/weekly', title: '周复盘' }],
          hideInMenu: true,
          title: '复盘详情',
        },
        name: 'WeeklyResearchReport',
        path: '/report/weekly/:slug',
      },
      {
        component: () => import('#/views/research/report.vue'),
        meta: {
          breadcrumbParents: [{ path: '/research/daily', title: '日复盘' }],
          hideInMenu: true,
          title: '复盘详情',
        },
        name: 'DailyResearchReport',
        path: '/report/daily/:slug',
      },
      {
        component: () => import('#/views/research/edit.vue'),
        meta: { hideInMenu: true, title: '编辑复盘' },
        name: 'ResearchEdit',
        path: '/research/edit/:params(.*)*',
      },
    ],
    meta: {
      icon: 'lucide:chart-no-axes-combined',
      order: 1,
      title: '周度研究',
    },
    name: 'Research',
    path: '/research-root',
    redirect: '/',
  },
];

export default routes;

import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    children: [
      {
        component: () => import('#/views/quant/overview.vue'),
        meta: { fullPathKey: false, icon: 'lucide:chart-spline', title: 'Quant 总览' },
        name: 'QuantOverview',
        path: '/quant',
      },
      {
        component: () => import('#/views/quant/strategies.vue'),
        meta: { fullPathKey: false, icon: 'lucide:list-ordered', title: 'Quant 策略' },
        name: 'QuantStrategies',
        path: '/quant/strategies',
      },
    ],
    meta: {
      icon: 'lucide:cpu',
      order: 4,
      title: '量化交易',
    },
    name: 'Quant',
    path: '/quant-root',
    redirect: '/quant',
  },
];

export default routes;

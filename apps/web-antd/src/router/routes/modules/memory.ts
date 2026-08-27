import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    children: [
      {
        component: () => import('#/views/memory/index.vue'),
        meta: { fullPathKey: false, icon: 'lucide:brain', title: 'Memo 时间流' },
        name: 'MemoryTimeline',
        path: '/memory',
      },
      {
        component: () => import('#/views/memory/detail.vue'),
        meta: { hideInMenu: true, title: '新建 Memo' },
        name: 'MemoryNew',
        path: '/memory/new',
      },
      {
        component: () => import('#/views/memory/detail.vue'),
        meta: {
          breadcrumbParents: [{ path: '/memory', title: 'Memo 时间流' }],
          hideInMenu: true,
          title: 'Memo 详情',
        },
        name: 'MemoryDetail',
        path: '/memory/:id',
      },
    ],
    meta: {
      icon: 'lucide:brain-circuit',
      order: 3,
      title: '记忆中心',
    },
    name: 'Memory',
    path: '/memory-root',
    redirect: '/memory',
  },
];

export default routes;

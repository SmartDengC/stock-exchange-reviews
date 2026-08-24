import type { RouteRecordRaw } from 'vue-router';

import { mergeRouteModules } from '@vben/utils';

import { coreRoutes, fallbackNotFoundRoute } from './core';

const routeModules = import.meta.glob('./modules/**/*.ts', { eager: true });
const accessRoutes: RouteRecordRaw[] = mergeRouteModules(routeModules);
const routes: RouteRecordRaw[] = [...coreRoutes, fallbackNotFoundRoute];

export { accessRoutes, routes };

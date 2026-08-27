import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';

import researchRoutes from '#/router/routes/modules/research';
import { generateMenus } from '../packages/utils/src/helpers/generate-menus';

function renderedBreadcrumbEntriesFor(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: researchRoutes,
  });

  const resolved = router.resolve(path);
  return resolved.matched.flatMap((match, index, matched) => {
    const parents = index === matched.length - 1 && Array.isArray(match.meta.breadcrumbParents)
      ? match.meta.breadcrumbParents
      : [];
    return [
      ...parents,
      {
        path: match.path,
        title: match.meta.title,
      },
    ];
  });
}

describe('research report routes', () => {
  it('keeps archive menu entries pointed at archive pages', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: researchRoutes,
    });
    const menus = generateMenus(researchRoutes, router);
    const researchMenu = menus.find((menu) => menu.name === '周度研究');
    const weeklyMenu = researchMenu?.children?.find((menu) => menu.name === '周复盘');
    const dailyMenu = researchMenu?.children?.find((menu) => menu.name === '日复盘');

    expect(weeklyMenu?.path).toBe('/research/weekly');
    expect(weeklyMenu?.children).toEqual([]);
    expect(dailyMenu?.path).toBe('/research/daily');
    expect(dailyMenu?.children).toEqual([]);
  });

  it('keeps weekly report details under the weekly archive breadcrumb chain', () => {
    expect(renderedBreadcrumbEntriesFor('/report/weekly/2026-W34').map((entry) => entry.title)).toEqual(['周度研究', '周复盘', '复盘详情']);
  });

  it('points weekly and daily breadcrumb parents back to archive pages', () => {
    expect(renderedBreadcrumbEntriesFor('/report/weekly/2026-W34')).toEqual([
      { path: '/research-root', title: '周度研究' },
      { path: '/research/weekly', title: '周复盘' },
      { path: '/report/weekly/:slug', title: '复盘详情' },
    ]);
    expect(renderedBreadcrumbEntriesFor('/report/daily/2026-08-27')).toEqual([
      { path: '/research-root', title: '周度研究' },
      { path: '/research/daily', title: '日复盘' },
      { path: '/report/daily/:slug', title: '复盘详情' },
    ]);
  });

  it('keeps daily report details under the daily archive breadcrumb chain', () => {
    expect(renderedBreadcrumbEntriesFor('/report/daily/2026-08-27').map((entry) => entry.title)).toEqual(['周度研究', '日复盘', '复盘详情']);
  });
});

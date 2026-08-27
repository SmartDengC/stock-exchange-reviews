import { createMemoryHistory, createRouter } from 'vue-router';

import { describe, expect, it } from 'vitest';

import memoryRoutes from '#/router/routes/modules/memory';

import { generateMenus } from '../packages/utils/src/helpers/generate-menus';

describe('memory routes', () => {
  it('exposes only the timeline as a menu entry', () => {
    const router = createRouter({ history: createMemoryHistory(), routes: memoryRoutes });
    const menu = generateMenus(memoryRoutes, router).find((item) => item.name === '记忆中心');

    expect(menu?.children?.map((item) => [item.name, item.path])).toEqual([
      ['Memo 时间流', '/memory'],
    ]);
  });

  it('resolves new and detail routes without treating new as an id', () => {
    const router = createRouter({ history: createMemoryHistory(), routes: memoryRoutes });

    expect(router.resolve('/memory/new').name).toBe('MemoryNew');
    expect(router.resolve('/memory/memo-1').name).toBe('MemoryDetail');
  });
});

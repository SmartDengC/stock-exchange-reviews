import { createMemoryHistory, createRouter } from 'vue-router';

import { describe, expect, it } from 'vitest';

import { accessRoutes } from '#/router/routes';

import { generateMenus } from '../packages/utils/src/helpers/generate-menus';

describe('quant routes', () => {
  it('exposes Quant overview and strategy entries in the sidebar', () => {
    const router = createRouter({ history: createMemoryHistory(), routes: accessRoutes });
    const menus = generateMenus(accessRoutes, router);
    const quantMenu = menus.find((item) => item.name === '量化交易');

    expect(quantMenu?.children?.map((item) => [item.name, item.path])).toEqual([
      ['Quant 总览', '/quant'],
      ['Quant 策略', '/quant/strategies'],
    ]);
    expect(router.resolve('/quant').name).toBe('QuantOverview');
    expect(router.resolve('/quant/strategies').name).toBe('QuantStrategies');
  });
});

import { createMemoryHistory, createRouter } from 'vue-router';

import { describe, expect, it } from 'vitest';

import { generateAccessible } from '../packages/effects/access/src/accessible';

describe('accessible routes', () => {
  it('keeps the layout root when a child also uses the absolute root path', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ children: [], name: 'Root', path: '/' }],
    });
    const routes = [
      {
        children: [{ name: 'ResearchOverview', path: '/' }],
        name: 'Research',
        path: '/research-root',
      },
    ];

    await generateAccessible('frontend', { roles: ['user'], router, routes });
    await expect(
      generateAccessible('frontend', { roles: ['user'], router, routes }),
    ).resolves.toBeDefined();

    const root = router.getRoutes().find((route) => route.name === 'Root');
    expect(root?.children.map((route) => route.name)).toContain('Research');
  });
});

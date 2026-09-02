import { flushPromises, shallowMount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import Overview from '#/views/research/overview.vue';

const api = vi.hoisted(() => ({
  createMarketQuoteConfig: vi.fn(),
  disableMarketQuoteConfig: vi.fn(),
  getMarketQuotes: vi.fn(),
  isCanceledRequest: vi.fn(() => false),
  listMarketQuoteConfigs: vi.fn(),
  listResearchReviews: vi.fn(),
  updateMarketQuoteConfig: vi.fn(),
}));

vi.mock('#/api', () => api);

const weeklyReview = {
  content: '# 周复盘',
  createdAt: '2026-08-30T10:00:00.000Z',
  dateLabel: '2026年8月24日-28日',
  id: 'weekly-1',
  kind: 'weekly' as const,
  slug: '2026-W35',
  title: '最新周复盘',
  updatedAt: '2026-08-30T11:00:00.000Z',
  version: 1,
};

const dailyReview = {
  content: '# 日复盘',
  createdAt: '2026-08-31T10:00:00.000Z',
  dateLabel: '2026年8月31日',
  id: 'daily-1',
  kind: 'daily' as const,
  slug: '2026-08-31',
  title: '最新日复盘',
  updatedAt: '2026-08-31T11:00:00.000Z',
  version: 1,
};

const newestWeeklyReview = {
  ...weeklyReview,
  id: 'weekly-2',
  slug: '2026-W36',
  title: '最新周复盘（第36周）',
};

async function mountOverview() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { component: Overview, name: 'Overview', path: '/research/overview' },
      { name: 'ResearchReport', path: '/report/:kind/:slug' },
      { name: 'ResearchEdit', path: '/research/edit/:params(.*)*' },
      { name: 'ResearchArchive', path: '/research/:kind' },
    ],
  });
  await router.push('/research/overview');
  await router.isReady();
  const wrapper = shallowMount(Overview, {
    global: {
      plugins: [router],
      stubs: {
        'a-button': { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
        'a-card': { template: '<article><slot name="title" /><slot /></article>' },
        'a-drawer': { template: '<aside v-if="open"><slot /></aside>', props: { open: Boolean } },
        'a-empty': { template: '<div><slot />{{ description }}</div>', props: { description: String } },
        PageFrame: { template: '<main><slot name="actions" /><slot /></main>' },
        'a-tag': { template: '<span><slot /></span>' },
      },
    },
  });
  await flushPromises();
  return { router, wrapper };
}

describe('research overview reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getMarketQuotes.mockResolvedValue({ fetchedAt: '2026-09-01T10:00:00.000Z', items: [], source: '新浪财经' });
    api.listMarketQuoteConfigs.mockResolvedValue([]);
    api.listResearchReviews.mockImplementation(({ kind }: { kind: 'daily' | 'weekly' }) =>
      Promise.resolve(kind === 'weekly' ? [weeklyReview, newestWeeklyReview] : [dailyReview]),
    );
  });

  it('loads and renders the latest weekly and daily reviews', async () => {
    const { wrapper } = await mountOverview();

    expect(api.listResearchReviews).toHaveBeenCalledWith({ kind: 'weekly' });
    expect(api.listResearchReviews).toHaveBeenCalledWith({ kind: 'daily' });
    expect(wrapper.text()).toContain('最新周复盘（第36周）');
    expect(wrapper.text()).toContain('最新日复盘');
  });

  it('opens the daily review report from its card', async () => {
    const { router, wrapper } = await mountOverview();

    const dailyButton = wrapper.find('.daily-review-card').findAll('button').find((button) => button.text() === '打开完整报告');
    await dailyButton?.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/report/daily/2026-08-31');
  });
});

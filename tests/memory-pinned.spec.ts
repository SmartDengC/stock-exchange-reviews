import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import memoryRoutes from '#/router/routes/modules/memory';
import MemoryPinned from '#/views/memory/pinned.vue';

const api = vi.hoisted(() => ({
  apiUrl: vi.fn((path: string) => `http://localhost:8000${path}`),
  isCanceledRequest: vi.fn(() => false),
  listMemos: vi.fn(),
}));

vi.mock('#/api', () => api);

const memo = {
  attachments: [],
  createdAt: '2026-08-27T12:00:00.000Z',
  id: 'memo-1',
  pinned: true,
  sourceType: 'text' as const,
  text: '# 完整固定 Memo\n\n这段正文不应该被摘要截断。',
  updatedAt: '2026-08-27T12:00:00.000Z',
  version: 2,
};

describe('pinned memory overview', () => {
  beforeEach(() => vi.clearAllMocks());

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('loads every pinned page and renders full Markdown content', async () => {
    api.listMemos
      .mockResolvedValueOnce({ hasMore: true, items: [memo], page: 1, pageSize: 50, total: 2 })
      .mockResolvedValueOnce({
        hasMore: false,
        items: [{ ...memo, id: 'memo-2', text: '第二条固定 Memo' }],
        page: 2,
        pageSize: 50,
        total: 2,
      });
    const router = createRouter({ history: createMemoryHistory(), routes: memoryRoutes });
    await router.push('/memory/pinned');
    await router.isReady();

    const wrapper = mount(MemoryPinned, { attachTo: document.body, global: { plugins: [router] } });
    await flushPromises();

    expect(api.listMemos).toHaveBeenNthCalledWith(1, { page: 1, pageSize: 50, pinned: true }, expect.any(AbortSignal));
    expect(api.listMemos).toHaveBeenNthCalledWith(2, { page: 2, pageSize: 50, pinned: true }, expect.any(AbortSignal));
    expect(wrapper.findAll('.memo-pinned-card')).toHaveLength(2);
    expect(wrapper.find('.memo-pinned-card .markdown-document').text()).toContain('完整固定 Memo');
    expect(wrapper.text()).toContain('这段正文不应该被摘要截断。');
    expect(wrapper.text()).toContain('第二条固定 Memo');
  });

  it('shows an empty state when no memo is pinned', async () => {
    api.listMemos.mockResolvedValueOnce({ hasMore: false, items: [], page: 1, pageSize: 50, total: 0 });
    const router = createRouter({ history: createMemoryHistory(), routes: memoryRoutes });
    await router.push('/memory/pinned');
    await router.isReady();

    const wrapper = mount(MemoryPinned, { attachTo: document.body, global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.text()).toContain('暂无固定 Memo');
  });
});

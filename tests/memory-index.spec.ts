import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it, vi } from 'vitest';

import memoryRoutes from '#/router/routes/modules/memory';
import MemoryIndex from '#/views/memory/index.vue';

const api = vi.hoisted(() => ({
  deleteMemo: vi.fn(),
  getMemo: vi.fn(),
  isCanceledRequest: vi.fn(() => false),
  listMemos: vi.fn(),
  updateMemo: vi.fn(),
}));

vi.mock('#/api', () => api);
vi.mock('#/api/request', () => ({ apiUrl: (path: string) => `http://localhost:8000${path}` }));

const listMemo = {
  attachments: [],
  createdAt: '2026-08-27T12:00:00.000Z',
  id: 'memo-1',
  sourceType: 'text' as const,
  text: '列表里的 Memo',
  updatedAt: '2026-08-27T12:00:00.000Z',
  version: 1,
};

const detailMemo = {
  ...listMemo,
  text: '弹框里的完整 Memo 详情',
};

describe('memory index', () => {
  it('opens memo details in a centered modal without leaving the timeline route', async () => {
    api.listMemos.mockResolvedValueOnce({
      hasMore: false,
      items: [listMemo],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    api.getMemo.mockResolvedValueOnce(detailMemo);
    const router = createRouter({ history: createMemoryHistory(), routes: memoryRoutes });
    await router.push('/memory');
    await router.isReady();

    const wrapper = mount(MemoryIndex, { attachTo: document.body, global: { plugins: [router] } });
    await flushPromises();

    await wrapper.find('.memo-list-item').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/memory');
    expect(api.getMemo).toHaveBeenCalledWith('memo-1');
    expect((document.body.querySelector('.memo-detail-modal textarea') as HTMLTextAreaElement).value).toBe('弹框里的完整 Memo 详情');
  });
});

import { flushPromises, mount } from '@vue/test-utils';
import { message } from '../apps/web-antd/node_modules/ant-design-vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import memoryRoutes from '#/router/routes/modules/memory';
import MemoryDetail from '#/views/memory/detail.vue';

const api = vi.hoisted(() => ({
  createMemo: vi.fn(),
  deleteMemo: vi.fn(),
  getMemo: vi.fn(),
  updateMemo: vi.fn(),
}));

vi.mock('#/api', () => api);
vi.mock('#/api/request', () => ({ apiUrl: (path: string) => `http://localhost:8000${path}` }));

const sampleMemo = {
  attachments: [],
  createdAt: '2026-08-27T12:00:00.000Z',
  id: 'memo-1',
  sourceType: 'text' as const,
  text: '保存一条 Memo',
  updatedAt: '2026-08-27T12:00:00.000Z',
  version: 1,
};

async function mountNewMemo() {
  const router = createRouter({ history: createMemoryHistory(), routes: memoryRoutes });
  await router.push('/memory/new');
  await router.isReady();

  const wrapper = mount(MemoryDetail, { global: { plugins: [router] } });
  await flushPromises();

  return { router, wrapper };
}

describe('memory detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the new memo editor without fetching an undefined id', async () => {
    const { wrapper } = await mountNewMemo();

    expect(wrapper.text()).toContain('新建 Memo');
    expect(api.getMemo).not.toHaveBeenCalled();
  });

  it('shows a success message after creating a memo', async () => {
    const success = vi.spyOn(message, 'success').mockImplementation(vi.fn());
    api.createMemo.mockResolvedValueOnce(sampleMemo);
    const { wrapper } = await mountNewMemo();

    await wrapper.find('textarea').setValue(sampleMemo.text);
    await wrapper.find('.page-actions .ant-btn-primary').trigger('click');
    await flushPromises();

    expect(success).toHaveBeenCalledWith('Memo 已保存');
  });

  it('shows an error message when creating a memo fails', async () => {
    const failure = vi.spyOn(message, 'error').mockImplementation(vi.fn());
    api.createMemo.mockRejectedValueOnce(new Error('上传失败'));
    const { wrapper } = await mountNewMemo();

    await wrapper.find('textarea').setValue(sampleMemo.text);
    await wrapper.find('.page-actions .ant-btn-primary').trigger('click');
    await flushPromises();

    expect(failure).toHaveBeenCalledWith('上传失败');
  });
});

import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import memoryRoutes from '#/router/routes/modules/memory';
import MemoryIndex from '#/views/memory/index.vue';

const api = vi.hoisted(() => ({
  apiUrl: vi.fn((path: string) => `http://localhost:8000${path}`),
  deleteMemo: vi.fn(),
  getMemo: vi.fn(),
  isCanceledRequest: vi.fn(() => false),
  listMemos: vi.fn(),
  updateMemo: vi.fn(),
  uploadMemoAttachments: vi.fn(),
}));

vi.mock('#/api', () => api);
vi.mock('#/api/request', () => ({ apiUrl: (path: string) => `http://localhost:8000${path}` }));

function clickElement(element: Element) {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

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

const detailMemoWithAttachment = {
  ...detailMemo,
  attachments: [
    {
      accessUrl: '/api/memos/attachments/file-1',
      contentType: 'image/png',
      createdAt: '2026-08-27T12:01:00.000Z',
      fileName: 'chart.png',
      id: 'file-1',
      size: 68,
    },
  ],
  version: 2,
};

describe('memory index', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-27T08:00:00+08:00'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('loads the timeline with the default last seven days date range', async () => {
    api.listMemos.mockResolvedValueOnce({
      hasMore: false,
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });
    const router = createRouter({ history: createMemoryHistory(), routes: memoryRoutes });
    await router.push('/memory');
    await router.isReady();

    mount(MemoryIndex, { attachTo: document.body, global: { plugins: [router] } });
    await flushPromises();

    expect(api.listMemos).toHaveBeenCalledWith(
      { from: '2026-08-20', page: 1, pageSize: 20, q: undefined, to: '2026-08-27' },
      expect.any(AbortSignal),
    );
  });

  it('allows clearing start and end dates before querying', async () => {
    api.listMemos.mockResolvedValue({
      hasMore: false,
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });
    const router = createRouter({ history: createMemoryHistory(), routes: memoryRoutes });
    await router.push('/memory');
    await router.isReady();

    const wrapper = mount(MemoryIndex, { attachTo: document.body, global: { plugins: [router] } });
    await flushPromises();
    const pickers = wrapper.findAllComponents({ name: 'ADatePicker' });
    pickers[0]!.vm.$emit('update:value', '');
    pickers[1]!.vm.$emit('update:value', '');
    await wrapper.find('.memo-filter-bar .ant-btn').trigger('click');
    await flushPromises();

    expect(api.listMemos).toHaveBeenLastCalledWith(
      { from: undefined, page: 1, pageSize: 20, q: undefined, to: undefined },
      expect.any(AbortSignal),
    );
  });

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

  it('uploads pending files from the memo detail modal and renders returned images', async () => {
    api.listMemos.mockResolvedValue({
      hasMore: false,
      items: [listMemo],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    api.getMemo.mockResolvedValueOnce(detailMemo);
    api.uploadMemoAttachments.mockResolvedValueOnce(detailMemoWithAttachment);
    const router = createRouter({ history: createMemoryHistory(), routes: memoryRoutes });
    await router.push('/memory');
    await router.isReady();

    const wrapper = mount(MemoryIndex, { attachTo: document.body, global: { plugins: [router] } });
    await flushPromises();
    await wrapper.find('.memo-list-item').trigger('click');
    await flushPromises();

    const upload = wrapper.findComponent({ name: 'AUpload' });
    const uploadFile = new File(['png'], 'chart.png', { type: 'image/png' });
    upload.props('beforeUpload')(uploadFile);
    await flushPromises();
    clickElement(document.body.querySelector('.memo-modal-actions .ant-btn-primary')!);
    await flushPromises();

    expect(api.uploadMemoAttachments).toHaveBeenCalledWith('memo-1', [uploadFile]);
    expect(document.body.textContent).toContain('chart.png');
    expect(document.body.querySelector('.memo-detail-modal img')?.getAttribute('src')).toBe('http://localhost:8000/api/memos/attachments/file-1');
  });
});

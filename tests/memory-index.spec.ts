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
  pinned: false,
  sourceType: 'text' as const,
  text: '列表里的 Memo',
  updatedAt: '2026-08-27T12:00:00.000Z',
  version: 1,
};

const detailMemo = {
  ...listMemo,
  text: `# 弹框里的完整 Memo 详情

https://example.com/research/with-a-very-long-path-that-should-stay-inside-the-drawer

~~~text
some code
~~~

| 观察 | 结论 |
| --- | --- |
| 趋势 | 等待确认 |`,
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

  it('loads the timeline with the default last thirty days date range', async () => {
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
      { from: '2026-07-28', page: 1, pageSize: 20, q: undefined, to: '2026-08-27' },
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

  it('opens memo details in a right drawer with rendered Markdown', async () => {
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
    expect(document.body.querySelector('.ant-drawer')).not.toBeNull();
    expect(document.body.querySelector('.markdown-document')?.textContent).toContain('弹框里的完整 Memo 详情');
    expect(document.body.querySelector('.memo-content-panel .markdown-document pre')).not.toBeNull();
    expect(document.body.querySelector('.memo-content-panel .markdown-document table')).not.toBeNull();
    expect(document.body.querySelector('.memo-detail-modal textarea')).toBeNull();
  });

  it('pins a memo from the detail drawer and updates its list marker', async () => {
    api.listMemos.mockResolvedValueOnce({
      hasMore: false,
      items: [listMemo],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    api.getMemo.mockResolvedValueOnce(detailMemo);
    api.updateMemo.mockResolvedValueOnce({ ...detailMemo, pinned: true, version: 2 });
    const router = createRouter({ history: createMemoryHistory(), routes: memoryRoutes });
    await router.push('/memory');
    await router.isReady();

    const wrapper = mount(MemoryIndex, { attachTo: document.body, global: { plugins: [router] } });
    await flushPromises();
    await wrapper.find('.memo-list-item').trigger('click');
    await flushPromises();

    clickElement(document.body.querySelector('.memo-pin-button')!);
    await flushPromises();

    expect(api.updateMemo).toHaveBeenCalledWith('memo-1', {
      pinned: true,
      text: detailMemo.text,
      version: 1,
    });
    expect(document.body.textContent).toContain('已固定');
    expect(router.currentRoute.value.path).toBe('/memory');
  });

  it('unpins a memo from the detail drawer', async () => {
    const pinnedMemo = { ...listMemo, pinned: true };
    api.listMemos.mockResolvedValueOnce({
      hasMore: false,
      items: [pinnedMemo],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    api.getMemo.mockResolvedValueOnce({ ...detailMemo, pinned: true });
    api.updateMemo.mockResolvedValueOnce({ ...detailMemo, pinned: false, version: 3 });
    const router = createRouter({ history: createMemoryHistory(), routes: memoryRoutes });
    await router.push('/memory');
    await router.isReady();

    const wrapper = mount(MemoryIndex, { attachTo: document.body, global: { plugins: [router] } });
    await flushPromises();
    await wrapper.find('.memo-list-item').trigger('click');
    await flushPromises();

    clickElement(document.body.querySelector('.memo-pin-button')!);
    await flushPromises();

    expect(api.updateMemo).toHaveBeenCalledWith('memo-1', {
      pinned: false,
      text: detailMemo.text,
      version: 1,
    });
    expect(document.body.textContent).not.toContain('已固定');
  });

  it('marks long list content as a bounded preview instead of clipping the card body', async () => {
    api.listMemos.mockResolvedValueOnce({
      hasMore: false,
      items: [{
        ...listMemo,
        text: Array.from({ length: 8 }, (_, index) => `${index + 1}. 一段很长的 Memo 内容`).join('\n'),
      }],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    const router = createRouter({ history: createMemoryHistory(), routes: memoryRoutes });
    await router.push('/memory');
    await router.isReady();

    const wrapper = mount(MemoryIndex, { attachTo: document.body, global: { plugins: [router] } });
    await flushPromises();

    const preview = wrapper.find('.memo-list-preview');
    expect(preview.exists()).toBe(true);
    expect(preview.text()).toContain('1. 一段很长的 Memo 内容');
  });

  it('opens the memo editor from the detail drawer and saves Markdown text', async () => {
    api.listMemos.mockResolvedValueOnce({
      hasMore: false,
      items: [listMemo],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    api.getMemo.mockResolvedValueOnce(detailMemo);
    api.updateMemo.mockResolvedValueOnce({ ...detailMemo, text: '# 已编辑', version: 2 });
    const router = createRouter({ history: createMemoryHistory(), routes: memoryRoutes });
    await router.push('/memory');
    await router.isReady();

    const wrapper = mount(MemoryIndex, { attachTo: document.body, global: { plugins: [router] } });
    await flushPromises();
    await wrapper.find('.memo-list-item').trigger('click');
    await flushPromises();

    clickElement(document.body.querySelector('.ant-drawer-extra .ant-btn-primary')!);
    await flushPromises();

    const editor = document.body.querySelector('.memo-detail-modal textarea') as HTMLTextAreaElement;
    expect(editor).not.toBeNull();
    editor.value = '# 已编辑';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    clickElement(document.body.querySelector('.memo-modal-actions .ant-btn-primary')!);
    await flushPromises();

    expect(api.updateMemo).toHaveBeenCalledWith('memo-1', { text: '# 已编辑', version: 1 });
    expect(document.body.querySelector('.memo-detail-modal textarea')).toBeNull();
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

    clickElement(document.body.querySelector('.ant-drawer-extra .ant-btn-primary')!);
    await flushPromises();

    const upload = wrapper.findComponent({ name: 'AUpload' });
    const uploadFile = new File(['png'], 'chart.png', { type: 'image/png' });
    upload.props('beforeUpload')(uploadFile);
    await flushPromises();
    clickElement(document.body.querySelector('.memo-modal-actions .ant-btn-primary')!);
    await flushPromises();

    expect(api.uploadMemoAttachments).toHaveBeenCalledWith('memo-1', [uploadFile]);
    expect(document.body.textContent).toContain('chart.png');
    expect(document.body.querySelector('.memo-detail-drawer img')?.getAttribute('src')).toBe('http://localhost:8000/api/memos/attachments/file-1');
  });
});

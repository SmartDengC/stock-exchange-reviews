import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import memoryRoutes from '#/router/routes/modules/memory';

import { message } from '../apps/web-antd/node_modules/ant-design-vue';

const api = vi.hoisted(() => ({
  createMemo: vi.fn(),
  deleteMemo: vi.fn(),
  getMemo: vi.fn(),
  isCanceledRequest: vi.fn(() => false),
  listMemos: vi.fn().mockResolvedValue({ hasMore: false, items: [], page: 1, pageSize: 50, total: 0 }),
  updateMemo: vi.fn(),
  uploadMemoAttachments: vi.fn(),
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

const mountedWrappers: Array<{ unmount: () => void }> = [];

async function mountNewMemo() {
  const router = createRouter({ history: createMemoryHistory(), routes: memoryRoutes });
  await router.push('/memory/new');
  await router.isReady();

  const wrapper = mount(RouterView, { global: { plugins: [router] } });
  mountedWrappers.push(wrapper);
  await flushPromises();

  return { router, wrapper };
}

async function mountExistingMemo() {
  api.getMemo.mockResolvedValueOnce(sampleMemo);
  const router = createRouter({ history: createMemoryHistory(), routes: memoryRoutes });
  await router.push(`/memory/${sampleMemo.id}`);
  await router.isReady();

  const wrapper = mount(RouterView, { global: { plugins: [router] } });
  mountedWrappers.push(wrapper);
  await flushPromises();

  return { router, wrapper };
}

describe('memory detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
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

  it('does not treat normalized text as unsaved after creating a memo', async () => {
    const confirm = vi.fn().mockReturnValue(false);
    Object.defineProperty(window, 'confirm', { configurable: true, value: confirm });
    api.createMemo.mockResolvedValueOnce({ ...sampleMemo, text: '保存一条 Memo' });
    const { router, wrapper } = await mountNewMemo();

    await wrapper.find('textarea').setValue('  保存一条 Memo  \n');
    await wrapper.find('.page-actions .ant-btn-primary').trigger('click');
    await flushPromises();

    expect(confirm).not.toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe(`/memory/${sampleMemo.id}`);
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('保存一条 Memo');
  });

  it('offers save, discard, or continue editing before leaving dirty memo', async () => {
    const confirm = vi.fn().mockReturnValue(false);
    Object.defineProperty(window, 'confirm', { configurable: true, value: confirm });
    const { router, wrapper } = await mountExistingMemo();

    await wrapper.find('textarea').setValue('改过的 Memo');
    await wrapper.find('.page-actions .ant-btn').trigger('click');
    await flushPromises();

    expect(confirm).not.toHaveBeenCalled();
    expect(document.body.querySelector('.memo-unsaved-modal')).not.toBeNull();
    expect(document.body.textContent).toContain('保存并离开');
    expect(document.body.textContent).toContain('放弃修改');
    expect(document.body.textContent).toContain('继续编辑');

    const continueButton = [...document.body.querySelectorAll('.memo-unsaved-modal .ant-btn')].find(
      (button) => button.textContent?.includes('继续编辑'),
    ) as HTMLElement;
    continueButton.click();
    await flushPromises();

    expect(router.currentRoute.value.path).toBe(`/memory/${sampleMemo.id}`);
    expect((document.body.querySelector('.memo-unsaved-modal .ant-modal') as HTMLElement).style.display).toBe('none');
  });

  it('discards dirty changes without saving when leaving', async () => {
    const { router, wrapper } = await mountExistingMemo();

    await wrapper.find('textarea').setValue('放弃这次修改');
    const navigation = router.push('/memory');
    await flushPromises();

    const discardButton = [...document.body.querySelectorAll('.memo-unsaved-modal .ant-btn')].find(
      (button) => button.textContent?.includes('放弃修改'),
    ) as HTMLElement;
    discardButton.click();
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flushPromises();
    await navigation;

    expect(api.updateMemo).not.toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe('/memory');
  });

  it('saves dirty changes before leaving when requested', async () => {
    const updatedMemo = { ...sampleMemo, text: '保存后离开', version: 2 };
    api.updateMemo.mockResolvedValueOnce(updatedMemo);
    const { router, wrapper } = await mountExistingMemo();

    await wrapper.find('textarea').setValue('  保存后离开  ');
    const navigation = router.push('/memory');
    await flushPromises();

    const saveAndLeaveButton = [...document.body.querySelectorAll('.memo-unsaved-modal .ant-btn')].find(
      (button) => button.textContent?.includes('保存并离开'),
    ) as HTMLElement;
    saveAndLeaveButton.click();
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flushPromises();
    await navigation;

    expect(api.updateMemo).toHaveBeenCalledWith('memo-1', { text: '  保存后离开  ', version: 1 });
    expect(router.currentRoute.value.path).toBe('/memory');
  });

  it('keeps the leave dialog open when save before leaving fails', async () => {
    const failure = vi.spyOn(message, 'error').mockImplementation(vi.fn());
    api.updateMemo.mockRejectedValueOnce(new Error('保存失败'));
    const { router, wrapper } = await mountExistingMemo();

    await wrapper.find('textarea').setValue('保存失败后继续编辑');
    const navigation = router.push('/memory');
    await flushPromises();

    const saveAndLeaveButton = [...document.body.querySelectorAll('.memo-unsaved-modal .ant-btn')].find(
      (button) => button.textContent?.includes('保存并离开'),
    ) as HTMLElement;
    saveAndLeaveButton.click();
    await flushPromises();

    expect(failure).toHaveBeenCalledWith('保存失败');
    expect(router.currentRoute.value.path).toBe(`/memory/${sampleMemo.id}`);
    expect((document.body.querySelector('.memo-unsaved-modal .ant-modal') as HTMLElement).style.display).not.toBe('none');

    const continueButton = [...document.body.querySelectorAll('.memo-unsaved-modal .ant-btn')].find(
      (button) => button.textContent?.includes('继续编辑'),
    ) as HTMLElement;
    continueButton.click();
    await navigation;
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

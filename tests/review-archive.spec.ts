import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ReviewArchive from '#/components/review-archive.vue';

const api = vi.hoisted(() => ({
  deleteResearchReview: vi.fn(),
  getResearchReview: vi.fn(),
  isCanceledRequest: vi.fn(() => false),
  listResearchReviews: vi.fn(),
  saveResearchReview: vi.fn(),
}));

const mountedWrappers: { unmount: () => void }[] = [];

vi.mock('#/api', () => api);

const review = {
  content: '# 日复盘\n\n今天的市场观察。',
  createdAt: '2026-08-30T10:00:00.000Z',
  dateLabel: '2026-08-30',
  id: 'review-1',
  kind: 'daily' as const,
  slug: '2026-08-30',
  title: '周末前的市场观察',
  updatedAt: '2026-08-30T11:00:00.000Z',
  version: 1,
};

function clickElement(element: Element) {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

async function mountArchive() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { component: ReviewArchive, name: 'DailyReviews', path: '/research/daily' },
      { name: 'ResearchReport', path: '/report/:kind/:slug' },
      { name: 'ResearchEdit', path: '/research/edit/:params(.*)*' },
    ],
  });
  await router.push('/research/daily');
  await router.isReady();
  const wrapper = mount(ReviewArchive, {
    attachTo: document.body,
    global: { plugins: [router] },
    props: { kind: 'daily' },
  });
  mountedWrappers.push(wrapper);
  await flushPromises();
  return { router, wrapper };
}

describe('research review archive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    api.listResearchReviews.mockResolvedValue([review]);
    api.getResearchReview.mockResolvedValue(review);
  });

  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    document.body.innerHTML = '';
  });

  it('opens the selected review in a right drawer with rendered Markdown', async () => {
    const { router, wrapper } = await mountArchive();

    await wrapper.find('.archive-table tbody tr').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/research/daily');
    expect(document.body.querySelector('.ant-drawer')).not.toBeNull();
    expect(document.body.querySelector('.markdown-document')?.textContent).toContain(
      '今天的市场观察',
    );
  });

  it('opens the existing editor route from the review detail drawer', async () => {
    const { router, wrapper } = await mountArchive();

    await wrapper.find('.archive-table tbody tr').trigger('click');
    await flushPromises();
    clickElement(document.body.querySelector('.ant-drawer-extra .ant-btn')!);
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/research/daily');
    expect(document.body.querySelector('.research-edit-modal')).not.toBeNull();
    expect(document.body.querySelector<HTMLInputElement>('input[placeholder="例：2026 年第 33 周市场周报"]')?.value).toBe('周末前的市场观察');
  });

  it('saves edits in the modal and returns to the updated detail drawer', async () => {
    const { router, wrapper } = await mountArchive();
    api.saveResearchReview.mockResolvedValueOnce({ ...review, content: '# 已更新' });

    await wrapper.find('.archive-table tbody tr').trigger('click');
    await flushPromises();
    clickElement(document.body.querySelector('.ant-drawer-extra .ant-btn')!);
    await flushPromises();

    const titleInput = document.body.querySelector<HTMLInputElement>('input[placeholder="例：2026 年第 33 周市场周报"]')!;
    titleInput.value = '更新后的标题';
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    const contentInput = document.body.querySelector<HTMLTextAreaElement>('.research-edit-modal textarea')!;
    contentInput.value = '# 已更新';
    contentInput.dispatchEvent(new Event('input', { bubbles: true }));
    clickElement(document.body.querySelector('.research-edit-modal .ant-btn-primary')!);
    await flushPromises();

    expect(api.saveResearchReview).toHaveBeenCalledWith('daily', '2026-08-30', {
      content: '# 已更新',
      dateLabel: '2026-08-30',
      title: '更新后的标题',
      version: 1,
    });
    expect(router.currentRoute.value.path).toBe('/research/daily');
    expect(document.body.querySelector('.markdown-document')?.textContent).toContain('已更新');
  });
});

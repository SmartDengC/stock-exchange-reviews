import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import editView from '#/views/research/edit.vue';

// 复刻 packages/effects/layouts/src/basic/content/content.vue 的重挂载行为：
// RouterView 以 route.fullPath 作为组件 key，query 变化会导致组件被重新挂载。
const Host = {
  template: `
    <router-view v-slot="{ Component, route }">
      <component :is="Component" :key="route.fullPath" />
    </router-view>
  `,
};

const api = vi.hoisted(() => ({
  deleteResearchReview: vi.fn(),
  getResearchReview: vi.fn(),
  saveResearchReview: vi.fn(),
}));

vi.mock('#/api', () => api);

const TITLE_PLACEHOLDER = '例：2026 年第 33 周市场周报';

async function mountEditor() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { component: editView, name: 'ResearchEdit', path: '/research/edit/:params(.*)*' },
    ],
  });
  await router.push('/research/edit/daily');
  await router.isReady();
  const wrapper = mount(Host, { attachTo: document.body, global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

describe('research edit preview mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    api.getResearchReview.mockResolvedValue({ title: '旧标题', dateLabel: '', content: '' });
  });

  it('keeps the entered form data when switching to preview', async () => {
    await mountEditor();

    const titleInput = document.body.querySelector<HTMLInputElement>(
      `input[placeholder="${TITLE_PLACEHOLDER}"]`,
    )!;
    const textarea = document.body.querySelector<HTMLTextAreaElement>('textarea')!;

    titleInput.value = '2026 年第 33 周市场周报';
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.value = '# 测试标题\n\n正文内容';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();
    expect(titleInput.value).toBe('2026 年第 33 周市场周报');

    const previewItem = [...document.body.querySelectorAll<HTMLElement>('.ant-segmented-item')].find(
      (item) => item.textContent?.includes('预览'),
    )!;
    previewItem.click();
    await flushPromises();

    // 切换到预览后，标题输入框必须仍然保留用户输入（组件不应被重新挂载）。
    const titleAfter = document.body.querySelector<HTMLInputElement>(
      `input[placeholder="${TITLE_PLACEHOLDER}"]`,
    );
    expect(titleAfter).toBeTruthy();
    expect(titleAfter!.value).toBe('2026 年第 33 周市场周报');

    // 内容区应展示预览而非空表单。
    expect(document.body.querySelector('.preview-surface')).toBeTruthy();
    const previewText = document.body.querySelector('.preview-surface')?.textContent ?? '';
    expect(previewText).toContain('测试标题');
  });

  it('does not write the mode into the URL query', async () => {
    const wrapper = await mountEditor();
    const previewItem = [...document.body.querySelectorAll<HTMLElement>('.ant-segmented-item')].find(
      (item) => item.textContent?.includes('预览'),
    )!;
    previewItem.click();
    await flushPromises();
    expect(wrapper.vm.$router.currentRoute.value.query.preview).toBeUndefined();
    wrapper.unmount();
  });
});

import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import editView from '#/views/research/edit.vue';

const api = vi.hoisted(() => ({
  deleteResearchReview: vi.fn(),
  getResearchReview: vi.fn(),
  saveResearchReview: vi.fn(),
}));

vi.mock('#/api', () => api);

async function mountEditor() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        component: editView,
        name: 'ResearchEdit',
        path: '/research/edit/:params(.*)*',
      },
      // save() 成功后会跳转 /report/...，需要一条路由承接避免警告。
      {
        component: { template: '<div />' },
        name: 'Report',
        path: '/report/:params(.*)*',
      },
    ],
  });
  await router.push('/research/edit/daily');
  await router.isReady();
  const wrapper = mount(editView, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  await flushPromises();
  return wrapper;
}

function setInput(selector: string, value: string) {
  const input = document.body.querySelector<HTMLInputElement>(selector)!;
  expect(input).toBeTruthy();
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function clickSave() {
  // ant-design-vue 会给两字按钮插入空格（“保存”→“保 存”），先去空白再匹配。
  const saveButton = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent?.replaceAll(/\s/g, '') === '保存',
  )!;
  expect(saveButton).toBeTruthy();
  saveButton.click();
  await flushPromises();
}

function formAlert() {
  return document.body.querySelector('.form-alert')?.textContent ?? '';
}

describe('research edit daily date label', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    api.saveResearchReview.mockResolvedValue({
      slug: '2026-08-26',
      title: '',
      dateLabel: '',
      content: '',
    });
  });

  it('hints the required YYYY-MM-DD format in the date label placeholder', async () => {
    const wrapper = await mountEditor();
    const input = document.body.querySelector<HTMLInputElement>(
      'input[placeholder="2026-08-26"]',
    );
    expect(input).toBeTruthy();
    wrapper.unmount();
  });

  it.each(['2026年8月26日', '2026-8-26', '2026-02-31', ''])(
    'blocks saving new daily reviews when date label is %p',
    async (label) => {
      const wrapper = await mountEditor();
      setInput('input[placeholder="2026-08-26"]', label);
      await clickSave();

      expect(api.saveResearchReview).not.toHaveBeenCalled();
      expect(formAlert()).toContain('YYYY-MM-DD');
      wrapper.unmount();
    },
  );

  it('saves with the ISO label as slug when the date label is valid', async () => {
    const wrapper = await mountEditor();
    setInput('input[placeholder="例：2026 年第 33 周市场周报"]', '8 月 26 日市场复盘');
    setInput('input[placeholder="2026-08-26"]', '2026-08-26');
    const textarea = document.body.querySelector<HTMLTextAreaElement>('textarea')!;
    textarea.value = '# 复盘内容';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();
    await clickSave();

    expect(formAlert()).toBe('');
    expect(api.saveResearchReview).toHaveBeenCalledTimes(1);
    expect(api.saveResearchReview).toHaveBeenCalledWith(
      'daily',
      '2026-08-26',
      expect.objectContaining({ dateLabel: '2026-08-26' }),
    );
    wrapper.unmount();
  });
});

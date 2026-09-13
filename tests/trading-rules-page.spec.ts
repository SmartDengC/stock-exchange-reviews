import { flushPromises, mount } from '@vue/test-utils';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import rulesView from '#/views/trading/rules.vue';

const api = vi.hoisted(() => ({
  createTradingRule: vi.fn(),
  deleteTradingRule: vi.fn(),
  listTradingRules: vi.fn(),
  updateTradingRule: vi.fn(),
}));

vi.mock('#/api', () => api);

const sampleRule = {
  id: 'rule-1',
  title: '不教人投资',
  description: '不主动给他人投资建议，分享经验但不代做决策。',
  sortOrder: 1,
  active: true,
  version: 2,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('trading rules page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    api.listTradingRules.mockResolvedValue([sampleRule]);
  });

  it('opens the selected rule in a right drawer with actions moved out of the table', async () => {
    const wrapper = mount(rulesView, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.find('thead').text()).not.toContain('状态');
    expect(wrapper.find('.ledger-table .ant-switch').exists()).toBe(false);
    expect(wrapper.find('.rule-description-full').text()).toBe(sampleRule.description);
    expect(wrapper.find('tbody').text()).not.toContain('编辑');
    expect(wrapper.find('tbody').text()).not.toContain('删除');

    await wrapper.find('.rule-select').trigger('click');
    await flushPromises();

    const drawer = document.body.querySelector('.rules-detail-drawer');
    expect(drawer).not.toBeNull();
    expect(drawer?.textContent).toContain('不教人投资');
    expect(drawer?.textContent).toContain('不主动给他人投资建议，分享经验但不代做决策。');
    expect(drawer?.querySelector('.rules-detail-actions')?.textContent).toContain('编辑');
    expect(drawer?.querySelector('.rules-detail-actions')?.textContent).toContain('删除');
    wrapper.unmount();
  });

  it('opens the existing edit form from the selected rule drawer', async () => {
    const wrapper = mount(rulesView, { attachTo: document.body });
    await flushPromises();

    await wrapper.find('.rule-select').trigger('click');
    await flushPromises();

    const editButton = document.body.querySelector('.rules-detail-actions .ant-btn-primary');
    editButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(document.body.querySelector('.ant-modal-title')?.textContent).toBe('编辑规则');
    expect(document.body.querySelector('.ant-modal input')?.getAttribute('value')).toBe(
      '不教人投资',
    );
    wrapper.unmount();
  });
});

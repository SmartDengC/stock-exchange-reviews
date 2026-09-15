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
  comment: '今天复盘时重点提醒自己不要替别人做决定。',
  ruleType: '趋势方向',
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
    expect(wrapper.find('thead').text()).toContain('规则类型');
    expect(wrapper.find('tbody').text()).toContain(sampleRule.ruleType);
    expect(wrapper.find('.ledger-table .ant-switch').exists()).toBe(false);
    expect(wrapper.find('.rule-description-full').text()).toBe(sampleRule.description);
    expect(wrapper.find('thead').text()).toContain('评论');
    expect(wrapper.find('.rule-comment-cell').text()).toContain(sampleRule.comment);
    expect(wrapper.find('tbody').text()).not.toContain('编辑');
    expect(wrapper.find('tbody').text()).not.toContain('删除');

    await wrapper.find('.rule-select').trigger('click');
    await flushPromises();

    const drawer = document.body.querySelector('.rules-detail-drawer');
    expect(drawer).not.toBeNull();
    expect(drawer?.textContent).toContain('不教人投资');
    expect(drawer?.textContent).toContain('不主动给他人投资建议，分享经验但不代做决策。');
    expect(drawer?.textContent).toContain(sampleRule.comment);
    expect(drawer?.querySelector('.rules-detail-actions')?.textContent).toContain('编辑');
    expect(drawer?.querySelector('.rules-detail-actions')?.textContent).toContain('删除');
    wrapper.unmount();
  });

  it('only queries after clicking the query button or pressing enter', async () => {
    const wrapper = mount(rulesView, { attachTo: document.body });
    await flushPromises();

    expect(api.listTradingRules).toHaveBeenCalledTimes(1);
    const input = wrapper.get('input[aria-label="搜索标题、描述或评论"]');
    await input.setValue('  投资  ');
    const typeFilter = wrapper.findAllComponents({ name: 'ASelect' })[0];
    typeFilter.vm.$emit('update:value', '趋势方向');
    await flushPromises();
    expect(api.listTradingRules).toHaveBeenCalledTimes(1);

    await wrapper.get('.ledger-filters .ant-btn').trigger('click');
    await flushPromises();
    expect(api.listTradingRules).toHaveBeenLastCalledWith('投资', '趋势方向');

    await input.setValue('复盘');
    await input.trigger('keydown.enter');
    await flushPromises();
    expect(api.listTradingRules).toHaveBeenLastCalledWith('复盘', '趋势方向');
    expect(api.listTradingRules).toHaveBeenCalledTimes(3);
    wrapper.unmount();
  });

  it('includes comment in create and edit forms', async () => {
    api.createTradingRule.mockResolvedValue(sampleRule);
    const wrapper = mount(rulesView, { attachTo: document.body });
    await flushPromises();

    await wrapper.get('.page-actions .ant-btn-primary').trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('评论');
    expect(document.body.textContent).toContain('规则类型');
    expect(document.body.querySelector('.ant-modal .ant-select-selection-item')?.textContent).toBe('交易规则');

    const titleInput = document.body.querySelector('.ant-modal input.ant-input') as HTMLInputElement;
    titleInput.value = '新规则';
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    const textareas = document.body.querySelectorAll('.ant-modal textarea');
    expect(textareas.length).toBeGreaterThan(0);
    const commentTextarea = textareas[textareas.length - 1] as HTMLTextAreaElement;
    commentTextarea.value = '新的评论';
    commentTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    const modalOk = document.body.querySelector('.ant-modal .ant-btn-primary');
    modalOk?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(api.createTradingRule).toHaveBeenCalledWith(
      expect.objectContaining({ comment: '新的评论', ruleType: '交易规则' }),
    );
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
    expect(document.body.querySelector('.rules-detail-drawer .rule-detail')).toBeNull();
    expect(document.body.querySelector('.rules-detail-actions')).toBeNull();
    expect(document.body.querySelector('.ant-modal input.ant-input')?.getAttribute('value')).toBe(
      '不教人投资',
    );
    const textareas = document.body.querySelectorAll('.ant-modal textarea');
    expect((textareas[textareas.length - 1] as HTMLTextAreaElement)?.value).toBe(sampleRule.comment);
    expect(document.body.querySelector('.ant-modal .ant-select-selection-item')?.textContent).toBe(
      sampleRule.ruleType,
    );
    wrapper.unmount();
  });

  it('shows an empty rule type as uncategorized and requires a type before saving', async () => {
    const uncategorizedRule = { ...sampleRule, ruleType: null };
    api.listTradingRules.mockResolvedValue([uncategorizedRule]);
    api.updateTradingRule.mockResolvedValue(uncategorizedRule);
    const wrapper = mount(rulesView, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.find('tbody').text()).toContain('未分类');
    await wrapper.find('.rule-select').trigger('click');
    await flushPromises();
    document.body.querySelector('.rules-detail-actions .ant-btn-primary')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
    await flushPromises();
    document.body.querySelector('.ant-modal .ant-btn-primary')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
    await flushPromises();

    expect(api.updateTradingRule).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('请选择规则类型。');
    wrapper.unmount();
  });
});

import { flushPromises, mount } from '@vue/test-utils';

import { describe, expect, it, vi } from 'vitest';

import { highlightPython } from '#/lib/python-highlight';

const { api } = vi.hoisted(() => ({
  api: {
    createQuantBacktest: vi.fn(),
    createQuantStrategy: vi.fn(),
    deleteQuantBacktest: vi.fn(),
    deleteQuantStrategy: vi.fn(),
    getQuantStrategy: vi.fn(),
    listQuantStrategies: vi.fn(),
    updateQuantBacktest: vi.fn(),
    updateQuantStrategy: vi.fn(),
  },
}));

vi.mock('#/api', () => api);

import QuantStrategies from '#/views/quant/strategies.vue';

const strategy = {
  createdAt: '2026-09-13T08:00:00Z',
  explanation: '# 指标\n\n## 入场\n\n## 出场\n\n## 风控\n\n## 注意事项',
  fileName: 'DemoStrategy.py',
  id: 'strategy-1',
  isExample: false,
  name: 'DemoStrategy',
  sourceCode: 'class DemoStrategy:\n    name = "demo"',
  summary: 'EMA 交叉策略',
  timeframe: '5m',
  updatedAt: '2026-09-13T08:00:00Z',
  version: 1,
  backtests: [],
};

describe('quant strategies page', () => {
  it('highlights Python keywords, strings, numbers, and comments safely', () => {
    const html = highlightPython('class Demo:\n    value = "demo"\n    count = 42  # note');

    expect(html).toContain('<span class="py-keyword">class</span>');
    expect(html).toContain('<span class="py-string">&quot;demo&quot;</span>');
    expect(html).toContain('<span class="py-comment"># note</span>');
    expect(html).toContain('<span class="py-number">42</span>');
    expect(highlightPython('<script>alert(1)</script>')).not.toContain('<script>');
  });

  it('renders the strategy table and opens detail on row action', async () => {
    api.listQuantStrategies.mockResolvedValue([strategy]);
    api.getQuantStrategy.mockResolvedValue(strategy);
    const wrapper = mount(QuantStrategies, { attachTo: document.body });

    await flushPromises();

    expect(wrapper.find('table').exists()).toBe(true);
    expect(wrapper.text()).toContain('DemoStrategy');
    await wrapper.get('[data-testid="strategy-detail-strategy-1"]').trigger('click');
    await flushPromises();
    expect(api.getQuantStrategy).toHaveBeenCalledWith('strategy-1');
    expect(document.body.textContent).toContain('class DemoStrategy:');
    wrapper.unmount();
  });

  it('shows an explicit empty state', async () => {
    api.listQuantStrategies.mockResolvedValue([]);
    const wrapper = mount(QuantStrategies);

    await flushPromises();

    expect(wrapper.text()).toContain('暂无量化策略');
    wrapper.unmount();
  });
});

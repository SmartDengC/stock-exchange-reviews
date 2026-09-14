import { flushPromises, mount } from '@vue/test-utils';

import { describe, expect, it } from 'vitest';

import { quantResearchStrategies } from '#/data/quant-research-strategies';
import QuantOverview from '#/views/quant/overview.vue';

describe('quant overview research digest', () => {
  it('contains ten crypto strategy research entries with traceable sources', () => {
    expect(quantResearchStrategies).toHaveLength(10);
    expect(new Set(quantResearchStrategies.map((item) => item.id)).size).toBe(10);
    expect(quantResearchStrategies.every((item) => item.sources.length > 0)).toBe(true);
    expect(quantResearchStrategies.every((item) => item.sources.every((source) => source.url.startsWith('http')))).toBe(true);
    expect(quantResearchStrategies.every((item) => item.verifiedAt === '2026-09-14')).toBe(true);
    expect(quantResearchStrategies.every((item) => item.risk && item.principle && item.signal)).toBe(true);
  });

  it('renders the non-ranking notice and all strategy cards', async () => {
    const wrapper = mount(QuantOverview);

    await flushPromises();

    expect(wrapper.text()).toContain('不是全市场胜率排行榜');
    expect(wrapper.text()).toContain('研究精选 10 类');
    expect(wrapper.findAll('[data-testid="quant-research-card"]')).toHaveLength(10);
    const sourceCount = quantResearchStrategies.reduce((total, item) => total + item.sources.length, 0);
    expect(wrapper.findAll('a[target="_blank"]')).toHaveLength(sourceCount);
    wrapper.unmount();
  });
});

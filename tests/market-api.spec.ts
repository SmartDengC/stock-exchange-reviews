import { describe, expect, it, vi } from 'vitest';

const requestClient = {
  delete: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
};

vi.mock('#/api/request', () => ({ requestClient }));

describe('market quote API', () => {
  it('uses the internal market endpoints for quotes and configuration', async () => {
    const {
      createMarketQuoteConfig,
      disableMarketQuoteConfig,
      getMarketQuotes,
      listMarketQuoteConfigs,
      updateMarketQuoteConfig,
    } = await import('#/api/market');
    const input = {
      displayName: '上证指数',
      enabled: true,
      market: 'A股',
      sinaSymbol: 'sh000001',
      sortOrder: 10,
      unit: '点',
    };

    await getMarketQuotes();
    await listMarketQuoteConfigs();
    await createMarketQuoteConfig(input);
    await updateMarketQuoteConfig('quote-1', { ...input, version: 1 });
    await disableMarketQuoteConfig('quote-1');

    expect(requestClient.get).toHaveBeenNthCalledWith(1, '/api/market/quotes', {});
    expect(requestClient.get).toHaveBeenNthCalledWith(2, '/api/market/quote-configs');
    expect(requestClient.post).toHaveBeenCalledWith('/api/market/quote-configs', input);
    expect(requestClient.put).toHaveBeenCalledWith('/api/market/quote-configs/quote-1', { ...input, version: 1 });
    expect(requestClient.delete).toHaveBeenCalledWith('/api/market/quote-configs/quote-1');
  });

  it('does not submit read-only fields when updating a quote configuration', async () => {
    const { updateMarketQuoteConfig } = await import('#/api/market');
    const input = {
      displayName: '恒生指数',
      enabled: true,
      id: 'quote-1',
      market: '港股',
      sinaSymbol: 'hkHSI',
      sortOrder: 20,
      unit: '点',
      version: 1,
    };

    await updateMarketQuoteConfig('quote-1', input);

    expect(requestClient.put).toHaveBeenLastCalledWith('/api/market/quote-configs/quote-1', {
      displayName: '恒生指数',
      enabled: true,
      market: '港股',
      sinaSymbol: 'hkHSI',
      sortOrder: 20,
      unit: '点',
      version: 1,
    });
  });

  it('passes an abort signal to quote reads', async () => {
    const { getMarketQuotes } = await import('#/api/market');
    const signal = new AbortController().signal;

    await getMarketQuotes(signal);

    expect(requestClient.get).toHaveBeenLastCalledWith('/api/market/quotes', { signal });
  });
});

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
});

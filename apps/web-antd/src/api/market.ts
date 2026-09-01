import type {
  MarketQuoteConfig,
  MarketQuoteConfigInput,
  MarketQuotesResponse,
} from '#/types/market';

import { requestClient } from './request';

function getMarketQuotes(signal?: AbortSignal) {
  return requestClient.get<MarketQuotesResponse>('/api/market/quotes', {
    ...(signal ? { signal } : {}),
  });
}

function listMarketQuoteConfigs() {
  return requestClient.get<MarketQuoteConfig[]>('/api/market/quote-configs');
}

function createMarketQuoteConfig(input: MarketQuoteConfigInput) {
  return requestClient.post<MarketQuoteConfig>('/api/market/quote-configs', input);
}

function updateMarketQuoteConfig(id: string, input: MarketQuoteConfigInput) {
  return requestClient.put<MarketQuoteConfig>(`/api/market/quote-configs/${id}`, input);
}

function disableMarketQuoteConfig(id: string) {
  return requestClient.delete<{ ok: boolean }>(`/api/market/quote-configs/${id}`);
}

export {
  createMarketQuoteConfig,
  disableMarketQuoteConfig,
  getMarketQuotes,
  listMarketQuoteConfigs,
  updateMarketQuoteConfig,
};

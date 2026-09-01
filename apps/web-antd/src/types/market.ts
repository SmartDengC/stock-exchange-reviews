export type MarketQuoteConfig = {
  displayName: string;
  enabled: boolean;
  id: string;
  market: string;
  sinaSymbol: string;
  sortOrder: number;
  unit: string;
  version: number;
};

export type MarketQuoteConfigInput = {
  displayName: string;
  enabled: boolean;
  market: string;
  sinaSymbol: string;
  sortOrder: number;
  unit: string;
  version?: number;
};

export type MarketQuoteItem = {
  change: null | string;
  changePercent: null | string;
  configId: string;
  displayName: string;
  market: string;
  message: null | string;
  quoteTime: null | string;
  sinaSymbol: string;
  status: 'error' | 'ok';
  unit: string;
  value: null | string;
};

export type MarketQuotesResponse = {
  fetchedAt: string;
  items: MarketQuoteItem[];
  source: string;
};

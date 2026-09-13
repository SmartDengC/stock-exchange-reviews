export type QuantBacktest = {
  createdAt: string;
  id: string;
  maxDrawdown: null | string;
  notes: null | string;
  pairs: string;
  profitFactor: null | string;
  runAt: string;
  strategyId: string;
  timeframe: string;
  timerange: string;
  totalReturn: null | string;
  tradeCount: null | number;
  updatedAt: string;
  version: number;
  winRate: null | string;
};

export type QuantStrategy = {
  backtests: QuantBacktest[];
  createdAt: string;
  explanation: string;
  fileName: string;
  id: string;
  isExample: boolean;
  latestBacktest: null | QuantBacktest;
  name: string;
  sourceCode: string;
  summary: string;
  timeframe: string;
  updatedAt: string;
  version: number;
};

export type QuantStrategyListItem = Omit<QuantStrategy, 'backtests' | 'explanation' | 'sourceCode'>;

export type QuantStrategyInput = {
  explanation: string;
  fileName: string;
  isExample: boolean;
  name: string;
  sourceCode: string;
  summary: string;
  timeframe: string;
  version?: number;
};

export type QuantBacktestInput = {
  maxDrawdown?: null | string;
  notes?: null | string;
  pairs: string;
  profitFactor?: null | string;
  runAt: string;
  timeframe: string;
  timerange: string;
  totalReturn?: null | string;
  tradeCount?: null | number;
  version?: number;
  winRate?: null | string;
};

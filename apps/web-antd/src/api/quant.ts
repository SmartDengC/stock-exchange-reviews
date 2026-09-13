import type {
  QuantBacktest,
  QuantBacktestInput,
  QuantStrategy,
  QuantStrategyInput,
  QuantStrategyListItem,
} from '#/types/quant';

import { requestClient } from './request';

function listQuantStrategies(query = '') {
  return requestClient.get<QuantStrategyListItem[]>('/api/quant/strategies', {
    params: { q: query || undefined },
  });
}

function getQuantStrategy(id: string) {
  return requestClient.get<QuantStrategy>(`/api/quant/strategies/${id}`);
}

function createQuantStrategy(input: QuantStrategyInput) {
  return requestClient.post<QuantStrategy>('/api/quant/strategies', input);
}

function updateQuantStrategy(id: string, input: QuantStrategyInput) {
  return requestClient.put<QuantStrategy>(`/api/quant/strategies/${id}`, input);
}

function deleteQuantStrategy(id: string) {
  return requestClient.delete<{ ok: boolean }>(`/api/quant/strategies/${id}`);
}

function createQuantBacktest(strategyId: string, input: QuantBacktestInput) {
  return requestClient.post<QuantBacktest>(`/api/quant/strategies/${strategyId}/backtests`, input);
}

function updateQuantBacktest(id: string, input: QuantBacktestInput) {
  return requestClient.put<QuantBacktest>(`/api/quant/backtests/${id}`, input);
}

function deleteQuantBacktest(id: string) {
  return requestClient.delete<{ ok: boolean }>(`/api/quant/backtests/${id}`);
}

export {
  createQuantBacktest,
  createQuantStrategy,
  deleteQuantBacktest,
  deleteQuantStrategy,
  getQuantStrategy,
  listQuantStrategies,
  updateQuantBacktest,
  updateQuantStrategy,
};

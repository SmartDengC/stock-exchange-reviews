import { describe, expect, it, vi } from 'vitest';

const { requestClient } = vi.hoisted(() => ({
  requestClient: {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('#/api/request', () => ({ requestClient }));

import {
  createQuantBacktest,
  createQuantStrategy,
  deleteQuantBacktest,
  deleteQuantStrategy,
  getQuantStrategy,
  listQuantStrategies,
  updateQuantBacktest,
  updateQuantStrategy,
} from '#/api/quant';

describe('quant strategy api', () => {
  it('uses the authenticated strategy and backtest endpoints', async () => {
    requestClient.get.mockResolvedValueOnce([]).mockResolvedValueOnce({ id: 'strategy-1' });
    requestClient.post.mockResolvedValueOnce({ id: 'strategy-2' }).mockResolvedValueOnce({ id: 'backtest-1' });
    requestClient.put.mockResolvedValueOnce({ id: 'strategy-1' }).mockResolvedValueOnce({ id: 'backtest-1' });
    requestClient.delete.mockResolvedValue({ ok: true });

    await listQuantStrategies('ema');
    await getQuantStrategy('strategy-1');
    await createQuantStrategy({} as never);
    await updateQuantStrategy('strategy-1', {} as never);
    await deleteQuantStrategy('strategy-1');
    await createQuantBacktest('strategy-1', {} as never);
    await updateQuantBacktest('backtest-1', {} as never);
    await deleteQuantBacktest('backtest-1');

    expect(requestClient.get).toHaveBeenNthCalledWith(1, '/api/quant/strategies', { params: { q: 'ema' } });
    expect(requestClient.get).toHaveBeenNthCalledWith(2, '/api/quant/strategies/strategy-1');
    expect(requestClient.post).toHaveBeenNthCalledWith(1, '/api/quant/strategies', {});
    expect(requestClient.put).toHaveBeenNthCalledWith(1, '/api/quant/strategies/strategy-1', {});
    expect(requestClient.delete).toHaveBeenNthCalledWith(1, '/api/quant/strategies/strategy-1');
    expect(requestClient.post).toHaveBeenNthCalledWith(2, '/api/quant/strategies/strategy-1/backtests', {});
    expect(requestClient.put).toHaveBeenNthCalledWith(2, '/api/quant/backtests/backtest-1', {});
    expect(requestClient.delete).toHaveBeenNthCalledWith(2, '/api/quant/backtests/backtest-1');
  });
});

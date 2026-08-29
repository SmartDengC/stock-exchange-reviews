import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestClient = {
  delete: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  request: vi.fn(),
};

vi.mock('#/api/request', () => ({
  apiUrl: (path: string) => `http://localhost:8000${path}`,
  requestClient,
}));

describe('trading API adapter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps the UI query field to the backend q parameter', async () => {
    requestClient.get.mockResolvedValue({ page: 1, pageSize: 50, total: 0, totalPages: 0, trades: [] });
    const { listTrades } = await import('#/api/trading');

    await listTrades({ page: 2, query: '黄金', status: 'closed' });

    expect(requestClient.get).toHaveBeenCalledWith('/api/trading/trades', {
      params: { page: 2, q: '黄金', status: 'closed' },
    });
  });

  it('passes cancellation signals to list and dashboard queries', async () => {
    requestClient.get.mockResolvedValue({});
    const { getTradingDashboard, listTrades } = await import('#/api/trading');
    const controller = new AbortController();

    await listTrades({ status: 'open' }, controller.signal);
    await getTradingDashboard({ from: '2026-08-01' }, controller.signal);

    expect(requestClient.get).toHaveBeenNthCalledWith(1, '/api/trading/trades', {
      params: { q: undefined, status: 'open' },
      signal: controller.signal,
    });
    expect(requestClient.get).toHaveBeenNthCalledWith(2, '/api/trading/dashboard', {
      params: { from: '2026-08-01' },
      signal: controller.signal,
    });
  });

  it('uploads each screenshot as an individual multipart request', async () => {
    requestClient.post.mockResolvedValue({});
    const { uploadTradeAttachments } = await import('#/api/trading');
    const files = [
      new File(['one'], 'one.png', { type: 'image/png' }),
      new File(['two'], 'two.webp', { type: 'image/webp' }),
    ];

    await uploadTradeAttachments('trade-1', files);

    expect(requestClient.post).toHaveBeenCalledTimes(2);
    for (const call of requestClient.post.mock.calls) {
      expect(call[0]).toBe('/api/trading/trades/trade-1/attachments');
      expect(call[1]).toBeInstanceOf(FormData);
      expect(call[2]).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
      expect((call[1] as FormData).get('file')).toBeInstanceOf(File);
    }
  });

  it('builds absolute credentialed download URLs with current filters', async () => {
    const { exportUrl } = await import('#/api/trading');
    expect(exportUrl({ from: '2026-08-01', query: 'MUUSDT' })).toBe(
      'http://localhost:8000/api/trading/export.xlsx?from=2026-08-01&q=MUUSDT',
    );
  });

  /**
   * 测试删除交易选项 API
   * 验证 deleteTradingOption 函数调用正确的端点
   */
  it('deletes a trading option by id', async () => {
    requestClient.delete.mockResolvedValue({
      options: [],
      settings: { defaultUsdtCnyRate: '7.2' },
    });
    const { deleteTradingOption } = await import('#/api/trading');

    await deleteTradingOption('option-1');

    expect(requestClient.delete).toHaveBeenCalledWith(
      '/api/trading/options/option-1',
    );
  });

  /**
   * 测试更新单个交易选项 API
   * 验证 updateTradingOption 函数使用 PATCH 方法更新指定选项
   */
  it('updates a trading option by id', async () => {
    requestClient.request.mockResolvedValue({
      active: false,
      id: 'option-1',
      kind: 'symbol',
      label: '沪深300',
      sortOrder: 50,
    });
    const { updateTradingOption } = await import('#/api/trading');

    await updateTradingOption('option-1', {
      active: false,
      kind: 'symbol',
      label: '沪深300',
      sortOrder: 50,
    });

    expect(requestClient.request).toHaveBeenCalledWith(
      '/api/trading/options/option-1',
      {
        data: {
          active: false,
          kind: 'symbol',
          label: '沪深300',
          sortOrder: 50,
        },
        method: 'PATCH',
      },
    );
  });
});

import { describe, expect, it, vi } from 'vitest';

const requestClient = {
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('#/api/request', () => ({ requestClient }));

describe('memos API adapter', () => {
  it('passes query text, date filters, pagination, and cancellation signal', async () => {
    requestClient.get.mockResolvedValue({ hasMore: false, items: [], page: 1, pageSize: 20, total: 0 });
    const { listMemos } = await import('#/api/memos');
    const controller = new AbortController();

    await listMemos(
      { from: '2026-08-20', page: 2, pageSize: 20, q: '交易计划', to: '2026-08-27' },
      controller.signal,
    );

    expect(requestClient.get).toHaveBeenCalledWith('/api/memos', {
      params: { from: '2026-08-20', page: 2, pageSize: 20, q: '交易计划', to: '2026-08-27' },
      signal: controller.signal,
    });
  });
});

import { describe, expect, it, vi } from 'vitest';

const requestClient = {
  get: vi.fn(),
};

vi.mock('#/api/request', () => ({ requestClient }));

describe('research review API adapter', () => {
  it('passes cancellation signals to archive queries', async () => {
    requestClient.get.mockResolvedValue([]);
    const { listResearchReviews } = await import('#/api/reviews');
    const controller = new AbortController();

    await listResearchReviews({ kind: 'weekly' }, controller.signal);

    expect(requestClient.get).toHaveBeenCalledWith('/api/reviews', {
      params: { kind: 'weekly' },
      signal: controller.signal,
    });
  });
});

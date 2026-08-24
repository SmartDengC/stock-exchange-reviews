import { describe, expect, it, vi } from 'vitest';

const requestClient = {
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('#/api/request', () => ({ requestClient }));

describe('cookie session API', () => {
  it('uses the Trading Cloud session endpoints without tokens', async () => {
    requestClient.get.mockResolvedValueOnce({ loggedIn: true, user: { role: 'user', username: 'admin' } });
    requestClient.post.mockResolvedValue({ loggedIn: false, user: null });
    const { fetchSession, login, logout, sessionUser } = await import('#/api/auth');

    const response = await fetchSession();
    await login({ password: 'secret', username: 'admin' });
    await logout();

    expect(requestClient.get).toHaveBeenCalledWith('/api/auth/session');
    expect(requestClient.post).toHaveBeenNthCalledWith(1, '/api/auth/login', { password: 'secret', username: 'admin' });
    expect(requestClient.post).toHaveBeenNthCalledWith(2, '/api/auth/logout');
    expect(sessionUser(response)).toEqual({ role: 'user', username: 'admin' });
    expect(sessionUser({ loggedIn: false, user: null })).toBeNull();
  });
});

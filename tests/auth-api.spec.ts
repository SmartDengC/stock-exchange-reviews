import { describe, expect, it, vi } from 'vitest';

const requestClient = {
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('#/api/request', () => ({ requestClient }));
vi.mock('#/api/login-crypto', () => ({ encryptPassword: vi.fn() }));

describe('cookie session API', () => {
  it('uses the Trading Cloud session endpoints without tokens', async () => {
    requestClient.get
      .mockResolvedValueOnce({ loggedIn: true, user: { role: 'user', username: 'admin' } })
      .mockResolvedValueOnce({
        algorithm: 'RSA-OAEP-256+A256GCM',
        keyId: 'key-id',
        publicKey: 'public-key',
      });
    requestClient.post.mockResolvedValue({ loggedIn: false, user: null });
    const { encryptPassword } = await import('#/api/login-crypto');
    vi.mocked(encryptPassword).mockResolvedValue({
      algorithm: 'RSA-OAEP-256+A256GCM',
      ciphertext: 'ciphertext',
      encryptedKey: 'encrypted-key',
      iv: 'iv',
      keyId: 'key-id',
    });
    const { fetchSession, login, logout, sessionUser } = await import('#/api/auth');

    const response = await fetchSession();
    await login({ password: 'secret', username: 'admin' });
    await logout();

    expect(requestClient.get).toHaveBeenCalledWith('/api/auth/session');
    expect(requestClient.get).toHaveBeenNthCalledWith(2, '/api/auth/encryption-key');
    expect(requestClient.post).toHaveBeenNthCalledWith(1, '/api/auth/login', {
      encryptedPassword: {
        algorithm: 'RSA-OAEP-256+A256GCM',
        ciphertext: 'ciphertext',
        encryptedKey: 'encrypted-key',
        iv: 'iv',
        keyId: 'key-id',
      },
      username: 'admin',
    });
    expect(JSON.stringify(requestClient.post.mock.calls[0][1])).not.toContain('secret');
    expect(requestClient.post).toHaveBeenNthCalledWith(2, '/api/auth/logout');
    expect(sessionUser(response)).toEqual({ role: 'user', username: 'admin' });
    expect(sessionUser({ loggedIn: false, user: null })).toBeNull();
  });

  it('does not fall back to a plaintext login when the key request fails', async () => {
    vi.resetModules();
    requestClient.get.mockReset().mockRejectedValue(new Error('key unavailable'));
    requestClient.post.mockReset();
    const { login } = await import('#/api/auth');

    await expect(login({ password: 'secret', username: 'admin' })).rejects.toThrow('key unavailable');
    expect(requestClient.post).not.toHaveBeenCalled();
  });
});

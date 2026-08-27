import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock navigator.sendBeacon
const mockSendBeacon = vi.fn().mockReturnValue(true);
Object.defineProperty(navigator, 'sendBeacon', {
  value: mockSendBeacon,
  writable: true,
});

// Mock requestClient (needed by auth.ts import)
vi.mock('#/api/request', () => ({
  requestClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('auth auto-logout', () => {
  beforeEach(() => {
    mockSendBeacon.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('postLogoutBeacon calls navigator.sendBeacon with the logout URL', async () => {
    const { postLogoutBeacon } = await import('#/api/auth');

    const result = postLogoutBeacon();

    expect(mockSendBeacon).toHaveBeenCalledWith('/api/auth/logout');
    expect(result).toBe(true);
  });

  it('postLogoutBeacon returns false when sendBeacon fails to queue', async () => {
    mockSendBeacon.mockReturnValueOnce(false);

    const { postLogoutBeacon } = await import('#/api/auth');

    const result = postLogoutBeacon();

    expect(mockSendBeacon).toHaveBeenCalledWith('/api/auth/logout');
    expect(result).toBe(false);
  });
});

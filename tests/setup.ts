import { vi } from 'vitest';

class ResizeObserverMock {
  disconnect() {}
  observe() {}
  unobserve() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);
vi.stubGlobal('matchMedia', (query: string) => ({
  addEventListener: vi.fn(),
  addListener: vi.fn(),
  dispatchEvent: vi.fn(),
  matches: false,
  media: query,
  onchange: null,
  removeEventListener: vi.fn(),
  removeListener: vi.fn(),
}));

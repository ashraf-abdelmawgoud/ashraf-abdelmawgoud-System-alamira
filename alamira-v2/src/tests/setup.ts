import '@testing-library/jest-dom';

// Robust in-memory localStorage mock for Node/jsdom test environments
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

const storageMock = createLocalStorageMock();

try {
  Object.defineProperty(window, 'localStorage', {
    value: storageMock,
    configurable: true,
    writable: true,
  });
} catch {
  // ignore if already defined
}

try {
  Object.defineProperty(globalThis, 'localStorage', {
    value: storageMock,
    configurable: true,
    writable: true,
  });
} catch {
  // ignore if already defined
}

if (typeof window !== 'undefined') {
  window.__ALAMIRA_CONFIG__ = {
    SUPABASE_URL: window.__ALAMIRA_CONFIG__?.SUPABASE_URL || 'https://mock.supabase.co',
    SUPABASE_ANON_KEY: window.__ALAMIRA_CONFIG__?.SUPABASE_ANON_KEY || 'mock-anon-key',
  };
}

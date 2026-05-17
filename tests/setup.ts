import React from 'react';
import '@testing-library/jest-dom/vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/gm/scenes',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn(), resolvedTheme: 'dark' }),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    const { src, alt, ...rest } = props;
    return React.createElement('img', { src, alt, ...rest });
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: null,
    isLoading: false,
    error: null,
    isError: false,
  }),
  useMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  }),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock relay module
vi.mock('@/lib/relay', () => ({
  relay: {
    health: vi.fn().mockResolvedValue({ status: 'ok' }),
    getScene: vi.fn().mockResolvedValue({ type: 'success', data: null }),
    getCanvasDocuments: vi.fn().mockResolvedValue({ type: 'success', data: [] }),
    structure: vi.fn().mockResolvedValue({ type: 'success', data: {} }),
    search: vi.fn().mockResolvedValue({ type: 'success', data: [] }),
    encounters: vi.fn().mockResolvedValue({ type: 'success', data: [] }),
    getClients: vi.fn().mockResolvedValue({ type: 'success', data: [] }),
    getUsers: vi.fn().mockResolvedValue({ type: 'success', data: [] }),
    getChatMessages: vi.fn().mockResolvedValue({ type: 'success', data: [] }),
    getRolls: vi.fn().mockResolvedValue({ type: 'success', data: [] }),
    worldInfo: vi.fn().mockResolvedValue({ id: 'test', title: 'Test World', modules: [] }),
    getMacros: vi.fn().mockResolvedValue({ type: 'success', data: [] }),
    getJournals: vi.fn().mockResolvedValue({ type: 'success', data: {} }),
  },
}));

// Mock zustand store
const mockStore = {
  config: {
    apiKey: 'test-key',
    clientId: 'test-client',
    relayUrl: '',
    role: 'gm' as const,
    clientName: 'Test Client',
  },
  setConfig: vi.fn(),
  reset: vi.fn(),
  apiKey: 'test-key',
  clientId: 'test-client',
};

vi.mock('@/lib/store', () => ({
  useStore: (selector?: (state: typeof mockStore) => unknown) =>
    selector ? selector(mockStore) : mockStore,
}));

// Mock @/lib/sse
vi.mock('@/lib/sse', () => ({
  sseManager: {
    connect: vi.fn(),
    disconnectAll: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  },
}));

// Mock @/lib/utils
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | boolean)[]) => classes.filter(Boolean).join(' '),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

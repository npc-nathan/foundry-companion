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

// Mock zustand store — full shape matching StoreState interface
const mockStore = {
  config: {
    apiKey: 'test-key',
    clientId: 'test-client',
    relayUrl: '',
    role: 'gm' as const,
    clientName: 'Test Client',
  },
  status: {
    connected: false,
    connecting: false,
    error: null,
    relayUrl: '',
  },
  ui: {
    themePreset: 'default',
    sidebarOpen: true,
    theme: 'dark' as const,
  },
  activeUserDm: null as string | null,
  activePartyDm: null as { id: string; name: string; members: string[] } | null,
  mutedUsers: [] as string[],
  parties: [] as { id: string; name: string; members: string[] }[],
  setConfig: vi.fn(),
  reset: vi.fn(),
  setConnected: vi.fn(),
  setStatus: vi.fn(),
  setError: vi.fn(),
  toggleSidebar: vi.fn(),
  toggleTheme: vi.fn(),
  setThemePreset: vi.fn(),
  setActiveUserDm: vi.fn(),
  setActivePartyDm: vi.fn(),
  setMutedUsers: vi.fn(),
  toggleMuteUser: vi.fn(),
  addParty: vi.fn(),
  removeParty: vi.fn(),
  addPartyMember: vi.fn(),
  removePartyMember: vi.fn(),
  apiKey: 'test-key',
  clientId: 'test-client',
};

vi.mock('@/lib/store', () => ({
  useStore: (selector?: (state: typeof mockStore) => unknown) =>
    selector ? selector(mockStore) : mockStore,
}));

// Mock theme modules used by ThemeManager (rendered inside ThemeSwitcher in sidebar)
vi.mock('@/lib/theme/registry', () => ({
  getAllThemes: () => [],
  getThemeById: vi.fn(),
  exportThemeAsJson: vi.fn(),
  deleteCustomTheme: vi.fn(),
  importThemeFromFile: vi.fn(),
  saveCustomTheme: vi.fn(),
}));

vi.mock('@/lib/theme/apply-theme', () => ({
  applyTheme: vi.fn(),
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

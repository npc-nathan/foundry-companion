import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SystemItemViewer from '@/components/character-sheet/system-item-viewer';

// Create a controllable mock for useQuery
const mockUseQuery = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
  useMutation: vi.fn().mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useQueryClient: vi.fn().mockReturnValue({
    invalidateQueries: vi.fn(),
  }),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('SystemItemViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: loading=false, data=null
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPaused: false,
      isPending: false,
      isInitialLoading: false,
      isRefetching: false,
      isStale: false,
      isSuccess: false,
      isPlaceholderData: false,
      promise: Promise.resolve(null),
      status: 'success' as const,
      fetchStatus: 'idle' as const,
      refetch: vi.fn(),
    });
  });

  it('shows loading state while fetching', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: false,
      isFetchedAfterMount: false,
      isFetching: true,
      isPaused: false,
      isPending: true,
      isInitialLoading: true,
      isRefetching: false,
      isStale: false,
      isSuccess: false,
      isPlaceholderData: false,
      promise: Promise.resolve(null),
      status: 'pending' as const,
      fetchStatus: 'fetching' as const,
      refetch: vi.fn(),
    });

    render(<SystemItemViewer systemItemUuid="Item.uuid-abc" />);
    expect(screen.getByText('Loading referenced entry...')).toBeDefined();
  });

  it('returns nothing when entry data is null', () => {
    const { container } = render(<SystemItemViewer systemItemUuid="Item.uuid-abc" />);
    expect(container.innerHTML).toBe('');
  });

  it('returns nothing when entry data has no data field', () => {
    mockUseQuery.mockReturnValue({
      data: {},
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPaused: false,
      isPending: false,
      isInitialLoading: false,
      isRefetching: false,
      isStale: false,
      isSuccess: true,
      isPlaceholderData: false,
      promise: Promise.resolve(null),
      status: 'success' as const,
      fetchStatus: 'idle' as const,
      refetch: vi.fn(),
    });

    const { container } = render(<SystemItemViewer systemItemUuid="Item.uuid-abc" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders item preview for item-type entries', () => {
    mockUseQuery.mockReturnValue({
      data: {
        data: {
          name: 'Longsword',
          type: 'weapon',
          img: 'systems/dnd5e/icons/weapons/sword.svg',
          system: {
            weight: { value: 3, units: 'lb' },
            price: { value: 15, denomination: 'gp' },
            damage: {
              base: { number: 1, denomination: 8, types: ['slashing'] },
            },
            description: { value: '<p>A classic blade.</p>' },
          },
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPaused: false,
      isPending: false,
      isInitialLoading: false,
      isRefetching: false,
      isStale: false,
      isSuccess: true,
      isPlaceholderData: false,
      promise: Promise.resolve(null),
      status: 'success' as const,
      fetchStatus: 'idle' as const,
      refetch: vi.fn(),
    });

    render(<SystemItemViewer systemItemUuid="Item.uuid-longsword" />);

    expect(screen.getByText('Longsword')).toBeDefined();
    expect(screen.getByText('Weapon')).toBeDefined();
    expect(screen.getByText('Weight')).toBeDefined();
    expect(screen.getByText('3 lb')).toBeDefined();
    expect(screen.getByText('Price')).toBeDefined();
    expect(screen.getByText('15 gp')).toBeDefined();
    expect(screen.getByText('Damage')).toBeDefined();
    expect(screen.getByText('1d8 slashing')).toBeDefined();
    expect(screen.getByText('A classic blade.')).toBeDefined();
  });

  it('renders item preview without image when img is missing', () => {
    mockUseQuery.mockReturnValue({
      data: {
        data: {
          name: 'Rope',
          type: 'loot',
          system: {
            weight: { value: 5, units: 'lb' },
            price: { value: 1, denomination: 'gp' },
            description: { value: 'A 50-foot rope.' },
          },
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPaused: false,
      isPending: false,
      isInitialLoading: false,
      isRefetching: false,
      isStale: false,
      isSuccess: true,
      isPlaceholderData: false,
      promise: Promise.resolve(null),
      status: 'success' as const,
      fetchStatus: 'idle' as const,
      refetch: vi.fn(),
    });

    render(<SystemItemViewer systemItemUuid="Item.uuid-rope" />);
    expect(screen.getByText('Rope')).toBeDefined();

    const images = screen.queryAllByRole('img');
    expect(images.length).toBe(0);
  });
});

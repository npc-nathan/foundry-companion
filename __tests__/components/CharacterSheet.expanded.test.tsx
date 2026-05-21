import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CharacterSheet from '../../components/CharacterSheet';

// We re-mock react-query in each test to get proper mock functions
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn(() => ({
  mutateAsync: vi.fn(),
  mutate: vi.fn(),
  isPending: false,
  data: null,
  error: null,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props;
    return <img src={src as string} alt={alt as string} {...rest} />;
  },
}));

vi.mock('@/lib/relay', () => ({
  relay: {
    get: vi.fn(),
    getActorEffects: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
});

/* ── Tests ────────────────────────────────────────────────────────────────── */

describe('CharacterSheet', () => {
  it('shows select-a-character prompt when no uuid provided', () => {
    render(<CharacterSheet uuid="" />);
    expect(screen.getByText('Select a character to view their sheet')).toBeTruthy();
  });

  it('shows loading state when isLoading prop is true', () => {
    render(<CharacterSheet uuid="Actor.abc123" isLoading={true} />);
    expect(screen.getByText('Loading character data...')).toBeTruthy();
  });

  it('shows loading state when useQuery isLoading is true', () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: true, error: null });
    render(<CharacterSheet uuid="Actor.abc123" />);
    expect(screen.getByText('Loading character data...')).toBeTruthy();
  });

  it('shows not-found state when query returns data with no name', () => {
    mockUseQuery.mockReturnValue({
      data: { data: {} },
      isLoading: false,
      error: null,
    });
    render(<CharacterSheet uuid="Actor.abc123" />);
    expect(screen.getByText('No character data found for this actor.')).toBeTruthy();
  });

  it('renders character name when data is available', () => {
    mockUseQuery.mockReturnValue({
      data: { data: { name: 'Grom Ironforge', system: { abilities: {}, details: {}, attributes: {} }, items: [] } },
      isLoading: false,
      error: null,
    });
    render(<CharacterSheet uuid="Actor.abc123" />);
    expect(screen.getByText('Grom Ironforge')).toBeTruthy();
  });

  it('renders tab navigation when character data is present', () => {
    mockUseQuery.mockReturnValue({
      data: { data: { name: 'Grom Ironforge', system: { abilities: {}, details: {}, attributes: {} }, items: [] } },
      isLoading: false,
      error: null,
    });
    render(<CharacterSheet uuid="Actor.abc123" />);
    expect(screen.getByText('Attributes')).toBeTruthy();
    expect(screen.getByText('Combat')).toBeTruthy();
    expect(screen.getByText('Inventory')).toBeTruthy();
    expect(screen.getByText('Spells')).toBeTruthy();
    expect(screen.getByText('Features')).toBeTruthy();
    expect(screen.getByText('Effects')).toBeTruthy();
  });
});

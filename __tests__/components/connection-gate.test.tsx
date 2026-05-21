import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectionGate } from '../../components/connection-gate';

// Mock the store with proper initial state
const mockSetConfig = vi.fn();
const mockSetStatus = vi.fn();
const mockSetConnected = vi.fn();

vi.mock('@/lib/store', () => ({
  useStore: () => ({
    config: { relayUrl: 'https://foundryrestapi.com', apiKey: '', role: '', clientId: '' },
    status: { connected: false },
    setConfig: mockSetConfig,
    setStatus: mockSetStatus,
    setConnected: mockSetConnected,
  }),
}));

vi.mock('@/lib/sse', () => ({
  sseManager: {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    disconnectAll: vi.fn(),
  },
}));

vi.mock('@/lib/session', () => ({
  startHeadlessSession: vi.fn(),
  endHeadlessSession: vi.fn(),
}));

// Mock shadcn/ui components that use @radix-ui
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (v: string) => void }) => (
    <div data-testid="mock-select" onClick={() => onValueChange?.('gm')}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder || ''}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <div data-value={value}>{children}</div>
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ConnectionGate', () => {
  it('renders the main login screen with card title', () => {
    render(<ConnectionGate />);
    const headings = screen.getAllByText('Connect to Foundry');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('shows API Key tab by default with Relay URL field', () => {
    render(<ConnectionGate />);
    const apiKeyElements = screen.getAllByText('API Key');
    expect(apiKeyElements.length).toBe(2); // tab button + label
    expect(screen.getByText('Direct Login')).toBeTruthy();
    // API Key mode fields
    expect(screen.getByLabelText('Relay URL')).toBeTruthy();
    expect(screen.getByLabelText('API Key')).toBeTruthy();
  });

  it('switches to Direct Login tab when clicked', () => {
    render(<ConnectionGate />);
    fireEvent.click(screen.getByText('Direct Login'));
    // Direct mode shows Foundry URL field
    expect(screen.getByLabelText('Foundry URL')).toBeTruthy();
    expect(screen.getByLabelText('Username')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByLabelText('World Name (optional)')).toBeTruthy();
  });

  it('shows error when Connect is clicked with empty fields', async () => {
    render(<ConnectionGate />);
    const buttons = screen.getAllByText('Connect to Foundry');
    fireEvent.click(buttons[1]); // the button, not the title
    expect(screen.getByText('Please fill in all fields')).toBeTruthy();
  });

  it('renders the setup instructions link', () => {
    render(<ConnectionGate />);
    const link = screen.getByText('View setup instructions');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe(
      'https://github.com/ThreeHats/foundryvtt-rest-api-relay',
    );
  });

  it('renders the GitHub link', () => {
    render(<ConnectionGate />);
    const link = screen.getByText('Foundry Companion on GitHub');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('https://github.com/npc-nathan/foundry-companion');
  });

  it('renders Role select dropdown in API Key mode', () => {
    render(<ConnectionGate />);
    expect(screen.getByText('Select a role')).toBeTruthy();
  });
});

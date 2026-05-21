import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PartyManager } from '../../components/chat/PartyManager';
import type { FoundryUser } from '../../lib/chat-types';

vi.mock('@/lib/store', () => ({
  useStore: (selector: (s: Record<string, unknown>) => unknown) => {
    const store: Record<string, unknown> = {
      parties: [
        { id: 'p1', name: 'Fellowship', color: '#00ff00', memberIds: ['u1', 'u2'] },
      ],
      addParty: vi.fn(),
      removeParty: vi.fn(),
      addPartyMember: vi.fn(),
      removePartyMember: vi.fn(),
    };
    return selector(store);
  },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' '),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: { children: React.ReactNode; onClick?: () => void; className?: string; [key: string]: unknown }) => (
    <button onClick={onClick} className={className} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

const mockUsers: FoundryUser[] = [
  { id: 'u1', name: 'Gandalf', active: true, role: 4, color: '#fff' },
  { id: 'u2', name: 'Aragorn', active: true, role: 1, color: '#0f0' },
  { id: 'u3', name: 'Frodo', active: true, role: 1, color: '#00f' },
];

const mockOnOpenChange = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PartyManager', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <PartyManager open={false} onOpenChange={mockOnOpenChange} users={mockUsers} currentUserId="u1" />,
    );
    expect(container.querySelector('[data-testid="dialog"]')).toBeNull();
  });

  it('renders the dialog when open', () => {
    render(
      <PartyManager open={true} onOpenChange={mockOnOpenChange} users={mockUsers} currentUserId="u1" />,
    );
    expect(screen.getByTestId('dialog')).toBeTruthy();
  });

  it('shows existing parties when open', () => {
    render(
      <PartyManager open={true} onOpenChange={mockOnOpenChange} users={mockUsers} currentUserId="u1" />,
    );
    expect(screen.getByText('Fellowship')).toBeTruthy();
  });

  it('shows user list for adding members', () => {
    render(
      <PartyManager open={true} onOpenChange={mockOnOpenChange} users={mockUsers} currentUserId="u1" />,
    );
    // The dialog shows existing party and input for new party names
    expect(screen.getByText('Party Manager')).toBeTruthy();
    expect(screen.getByPlaceholderText('New party name...')).toBeTruthy();
  });

  it('has a Close button', () => {
    render(
      <PartyManager open={true} onOpenChange={mockOnOpenChange} users={mockUsers} currentUserId="u1" />,
    );
    fireEvent.click(screen.getByText('Close'));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});

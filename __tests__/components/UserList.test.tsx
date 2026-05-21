import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserList } from '../../components/chat/UserList';
import type { FoundryUser } from '../../lib/chat-types';

/* ── Mocks ────────────────────────────────────────────────────────────────── */

const mockSetActiveUserDm = vi.fn();
const mockSetActivePartyDm = vi.fn();

vi.mock('@/lib/store', () => ({
  useStore: (selector: (s: Record<string, unknown>) => unknown) => {
    const store: Record<string, unknown> = {
      activeUserDm: null,
      activePartyDm: null,
      setActiveUserDm: mockSetActiveUserDm,
      setActivePartyDm: mockSetActivePartyDm,
      mutedUsers: ['u3'], // Gollum is muted (id is u3)
      parties: [
        { id: 'p1', name: 'Fellowship', color: '#00ff00', memberIds: ['u1', 'u2'] },
      ],
    };
    return selector(store);
  },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) =>
    classes.filter(Boolean).join(' '),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <span {...props}>{children}</span>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/* ── Test Data ────────────────────────────────────────────────────────────── */

const mockUsers: FoundryUser[] = [
  { id: 'u1', name: 'Gandalf', active: true, role: 4, character: { name: 'Mithrandir', uuid: '' }, color: '#fff' },
  { id: 'u2', name: 'Aragorn', active: true, role: 1, character: { name: 'Strider', uuid: '' }, color: '#0f0' },
  { id: 'u3', name: 'Gollum', active: false, role: 1, color: '#555' },
  { id: 'u4', name: 'Frodo', active: true, role: 1, color: '#00f' },
];

const mockOnWhisperUser = vi.fn();
const mockOnPartySelect = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

/* ── Tests ────────────────────────────────────────────────────────────────── */

describe('UserList', () => {
  it('renders the General channel button', () => {
    render(
      <UserList
        users={mockUsers}
        currentUserId="u0"
        onWhisperUser={mockOnWhisperUser}
        onPartySelect={mockOnPartySelect}
      />,
    );
    expect(screen.getByText('General')).toBeTruthy();
  });

  it('shows online user count', () => {
    render(
      <UserList
        users={mockUsers}
        currentUserId="u0"
        onWhisperUser={mockOnWhisperUser}
        onPartySelect={mockOnPartySelect}
      />,
    );
    expect(screen.getByText('Online — 3')).toBeTruthy();
  });

  it('shows offline user count', () => {
    render(
      <UserList
        users={mockUsers}
        currentUserId="u0"
        onWhisperUser={mockOnWhisperUser}
        onPartySelect={mockOnPartySelect}
      />,
    );
    expect(screen.getByText('Offline — 1')).toBeTruthy();
  });

  it('does not include current user in online list', () => {
    render(
      <UserList
        users={mockUsers}
        currentUserId="u1" // Gandalf is current user
        onWhisperUser={mockOnWhisperUser}
        onPartySelect={mockOnPartySelect}
      />,
    );
    // Only Aragorn and Frodo should be online (excluding current user u1=Gandalf)
    expect(screen.getByText('Online — 2')).toBeTruthy();
  });

  it('shows parties section with party names', () => {
    render(
      <UserList
        users={mockUsers}
        currentUserId="u0"
        onWhisperUser={mockOnWhisperUser}
        onPartySelect={mockOnPartySelect}
      />,
    );
    expect(screen.getByText('Fellowship')).toBeTruthy();
  });

  it('shows member count for each party', () => {
    render(
      <UserList
        users={mockUsers}
        currentUserId="u0"
        onWhisperUser={mockOnWhisperUser}
        onPartySelect={mockOnPartySelect}
      />,
    );
    expect(screen.getByText('2')).toBeTruthy(); // Fellowship has 2 members
  });

  it('renders user avatars for online users', () => {
    render(
      <UserList
        users={mockUsers}
        currentUserId="u0"
        onWhisperUser={mockOnWhisperUser}
        onPartySelect={mockOnPartySelect}
      />,
    );
    const gAvatars = screen.getAllByText('G'); // Gandalf + Gollum
    expect(gAvatars.length).toBe(2);
    expect(screen.getByText('A')).toBeTruthy(); // Aragorn
    expect(screen.getByText('F')).toBeTruthy(); // Frodo
  });

  it('shows muted user with muted styling', () => {
    render(
      <UserList
        users={mockUsers}
        currentUserId="u0"
        onWhisperUser={mockOnWhisperUser}
        onPartySelect={mockOnPartySelect}
      />,
    );
    const gollum = screen.getByText('Gollum');
    expect(gollum.className).toContain('line-through');
  });

  it('shows character name on hover (hidden by default)', () => {
    render(
      <UserList
        users={mockUsers}
        currentUserId="u0"
        onWhisperUser={mockOnWhisperUser}
        onPartySelect={mockOnPartySelect}
      />,
    );
    // Character names are hidden by default (group-hover:inline)
    const strider = screen.queryByText('(Strider)');
    expect(strider).toBeTruthy();
  });

  it('clicking General clears active DMs', () => {
    render(
      <UserList
        users={mockUsers}
        currentUserId="u0"
        onWhisperUser={mockOnWhisperUser}
        onPartySelect={mockOnPartySelect}
      />,
    );
    fireEvent.click(screen.getByText('General'));
    expect(mockSetActiveUserDm).toHaveBeenCalledWith(null);
    expect(mockSetActivePartyDm).toHaveBeenCalledWith(null);
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserAvatar } from '../../components/chat/UserAvatar';

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' '),
}));

describe('UserAvatar', () => {
  it('renders the first letter of the name', () => {
    render(<UserAvatar name="Gandalf" />);
    expect(screen.getByText('G')).toBeTruthy();
  });

  it('renders with a color prop', () => {
    render(<UserAvatar name="Frodo" color="#ff0000" />);
    const span = screen.getByText('F');
    expect(span).toBeTruthy();
  });

  it('shows online indicator when online is true', () => {
    render(<UserAvatar name="Aragorn" online={true} />);
    // The outer wrapper has relative positioning for the absolute-positioned dot
    const wrapper = screen.getByText('A').closest('.relative');
    expect(wrapper).toBeTruthy();
    // Should have 2 children: the avatar (inner span) and the online dot
    expect(wrapper!.children.length).toBe(2);
  });

  it('does not show online indicator when online is omitted', () => {
    render(<UserAvatar name="Legolas" />);
    const wrapper = screen.getByText('L').closest('.relative');
    expect(wrapper!.children.length).toBe(1); // just the avatar circle
  });

  it('shows offline indicator when online is false', () => {
    render(<UserAvatar name="Gollum" online={false} />);
    const wrapper = screen.getByText('G').closest('.relative');
    expect(wrapper!.children.length).toBe(2);
  });

  it('applies sm size by default', () => {
    render(<UserAvatar name="Samwise" />);
    const span = screen.getByText('S');
    expect(span.className).toContain('h-6');
    expect(span.className).toContain('w-6');
  });

  it('applies md size when specified', () => {
    render(<UserAvatar name="Merry" size="md" />);
    const span = screen.getByText('M');
    expect(span.className).toContain('h-8');
    expect(span.className).toContain('w-8');
  });

  it('handles empty name gracefully', () => {
    render(<UserAvatar name="" />);
    const spans = screen.getAllByText('');
    expect(spans.length).toBeGreaterThanOrEqual(1);
  });
});

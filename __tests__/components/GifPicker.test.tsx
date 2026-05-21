import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GifPicker } from '../../components/chat/GifPicker';

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' '),
}));

const mockOnClose = vi.fn();
const mockOnSelect = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GifPicker', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <GifPicker open={false} onClose={mockOnClose} onSelect={mockOnSelect} />,
    );
    expect(container.children.length).toBe(0);
  });

  it('shows search input when open', () => {
    render(
      <GifPicker open={true} onClose={mockOnClose} onSelect={mockOnSelect} />,
    );
    expect(screen.getByPlaceholderText('Search GIFs...')).toBeTruthy();
  });

  it('shows instruction text when open with no search', () => {
    render(
      <GifPicker open={true} onClose={mockOnClose} onSelect={mockOnSelect} />,
    );
    expect(screen.getByText('Search for GIFs to add to your message')).toBeTruthy();
  });

  it('has a close button', () => {
    render(
      <GifPicker open={true} onClose={mockOnClose} onSelect={mockOnSelect} />,
    );
    // X close button
    const closeButtons = screen.getAllByRole('button');
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('displays search input with correct placeholder', () => {
    render(
      <GifPicker open={true} onClose={mockOnClose} onSelect={mockOnSelect} />,
    );
    const input = screen.getByPlaceholderText('Search GIFs...');
    expect(input).toBeTruthy();
    expect(input.tagName).toBe('INPUT');
  });
});

// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/sidebar';

describe('Sidebar', () => {
  it('renders navigation links', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders GM section links', () => {
    render(<Sidebar />);
    // Key navigation items that should always be present
    const links = ['Dashboard', 'Scenes', 'Canvas', 'Actors', 'Compendium', 'Chat'];
    for (const link of links) {
      expect(screen.getByText(link)).toBeInTheDocument();
    }
  });

  it('has the app title', () => {
    render(<Sidebar />);
    expect(screen.getByText(/foundry/i)).toBeInTheDocument();
  });
});

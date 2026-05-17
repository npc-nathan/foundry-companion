// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CharacterSheet from '@/components/CharacterSheet';

describe('CharacterSheet', () => {
  it('renders without crashing with a uuid', () => {
    render(<CharacterSheet uuid="test-uuid-123" />);
    // Should render the container or fallback message
    expect(screen.getByText(/No character data/i)).toBeInTheDocument();
  });

  it('renders with custom test ID container', () => {
    const { container } = render(<CharacterSheet uuid="test-uuid-456" />);
    expect(container.querySelector('.space-y-6')).toBeInTheDocument();
  });
});

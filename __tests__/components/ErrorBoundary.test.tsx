import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Hello World</div>
      </ErrorBoundary>
    );
    expect(screen.getByTestId('child')).toBeDefined();
    expect(screen.getByText('Hello World')).toBeDefined();
  });

  it('renders default fallback when a child throws', () => {
    const ThrowingComponent = () => {
      throw new Error('Test error');
    };

    // Suppress console.error from React's error logging
    const originalError = console.error;
    console.error = vi.fn();

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    // Default fallback shows "Something went wrong"
    expect(screen.getByText(/something went wrong/i)).toBeDefined();
    console.error = originalError;
  });

  it('renders custom fallback when provided', () => {
    const ThrowingComponent = () => {
      throw new Error('Test error');
    };

    const originalError = console.error;
    console.error = vi.fn();

    render(
      <ErrorBoundary fallback={<div data-testid="custom">Custom Error UI</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom')).toBeDefined();
    expect(screen.getByText('Custom Error UI')).toBeDefined();
    console.error = originalError;
  });
});

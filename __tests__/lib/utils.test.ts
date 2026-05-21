vi.unmock('@/lib/utils');

import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn()', () => {
  it('joins string class names with a space', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters out falsy values', () => {
    expect(cn('foo', false, 'bar', null, undefined, 0)).toBe('foo bar');
  });

  it('handles a single class name', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('handles no arguments', () => {
    expect(cn()).toBe('');
  });

  it('handles conditional object notation via clsx', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('merges Tailwind class conflicts via twMerge (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('merges conflicting padding classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });
});

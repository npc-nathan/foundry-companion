'use client';

import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface HeadingAccentProps {
  children: ReactNode;
  className?: string;
  /** When true, only renders the marker if the theme has a heading accent color defined */
  ifDefined?: boolean;
}

/**
 * HeadingAccent — adds the theme's heading accent marker before the text.
 *
 * The marker shape & color come from CSS variables set per theme:
 * - Default: none (transparent)
 * - D&D: crimson square
 * - Cyberpunk: neon yellow line
 * - Warhammer: blood red square
 * - Pathfinder: emerald diamond
 *
 * Usage:
 *   <HeadingAccent><h1>Dashboard</h1></HeadingAccent>
 *   <h1><HeadingAccent>Dashboard</HeadingAccent></h1>
 */
export function HeadingAccent({
  children,
  className,
  ifDefined = false,
}: HeadingAccentProps) {
  return (
    <span
      className={cn(
        'heading-accent',
        ifDefined && 'heading-accent-if-defined',
        className,
      )}
    >
      {children}
    </span>
  );
}

'use client';

import { useStore } from '@/lib/store';

/**
 * Hook that returns the active theme ID and helper booleans.
 * Components can use this to apply theme-specific structural changes
 * beyond what CSS variables handle automatically.
 */
export function useThemeVariant() {
  const themePreset = useStore((s) => s.ui.themePreset);

  const isDefault = themePreset === 'default';
  const isDnd = themePreset === 'dnd';
  const isCyberpunk = themePreset === 'cyberpunk';
  const isWarhammer = themePreset === 'warhammer';
  const isPathfinder = themePreset === 'pathfinder';

  return {
    /** Raw theme preset ID from the store */
    themePreset,
    /** Concise variant class for conditional Tailwind: data-theme-variant="dnd" */
    dataAttr: themePreset,
    isDefault,
    isDnd,
    isCyberpunk,
    isWarhammer,
    isPathfinder,
  };
}

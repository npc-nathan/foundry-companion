'use client';

import { useEffect, useRef } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { useStore } from '@/lib/store';
import { getThemeById } from '@/lib/theme/registry';
import { applyTheme, clearThemeOverrides } from '@/lib/theme/apply-theme';

/**
 * Inner component that syncs the Zustand theme preset + dark/light state
 * to CSS variables on document.documentElement.
 */
function ThemeApplier({ children }: { children: React.ReactNode }) {
  const themePreset = useStore((s) => s.ui.themePreset);
  const theme = useTheme();
  const appliedPreset = useRef<string | null>(null);

  useEffect(() => {
    const isDark = theme.resolvedTheme === 'dark';
    const definition = getThemeById(themePreset);

    if (definition) {
      applyTheme(definition, isDark);
      appliedPreset.current = themePreset;
    } else if (themePreset !== 'default') {
      // Unknown theme ID — fall back to default
      const defaultDef = getThemeById('default');
      if (defaultDef) applyTheme(defaultDef, isDark);
    }
  }, [themePreset, theme.resolvedTheme]);

  // Clean up theme overrides on unmount
  useEffect(() => {
    return () => {
      if (appliedPreset.current && appliedPreset.current !== 'default') {
        clearThemeOverrides();
      }
    };
  }, []);

  return <>{children}</>;
}

/**
 * Wraps next-themes ThemeProvider and adds our custom theme system.
 * Usage: <ThemeProvider> replaces next-themes' <ThemeProvider>.
 */
export function ThemeProvider({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" disableTransitionOnChange {...props}>
      <ThemeApplier>{children}</ThemeApplier>
    </NextThemesProvider>
  );
}

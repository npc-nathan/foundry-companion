/**
 * Apply a theme's CSS variable overrides to document.documentElement.
 *
 * Injects the light or dark palette as inline styles on <html>,
 * overriding the globals.css defaults. Also applies font and style
 * tokens that aren't in the light/dark palette.
 *
 * Call this whenever the theme or color mode changes.
 */

import type { ThemeDefinition } from './types';

/**
 * Apply the given theme's CSS variables to the document root.
 * @param theme The theme definition to apply
 * @param isDark Whether to apply the dark or light palette
 */
export function applyTheme(theme: ThemeDefinition, isDark: boolean): void {
  const root = document.documentElement;
  const palette = isDark ? theme.dark : theme.light;

  // Set all palette variables
  for (const [key, value] of Object.entries(palette)) {
    if (key.startsWith('--')) {
      root.style.setProperty(key, value);
    }
  }

  // Apply radius scale if defined
  if (theme.radiusScale !== undefined) {
    const baseRadius = '0.625rem'; // shadcn default
    root.style.setProperty('--radius', `calc(${baseRadius} * ${theme.radiusScale})`);
  }

  // Apply font overrides
  if (theme.font?.heading) {
    root.style.setProperty('--font-heading-family', theme.font.heading);
  }
  if (theme.font?.sans) {
    root.style.setProperty('--font-sans', theme.font.sans);
  }
  if (theme.font?.mono) {
    root.style.setProperty('--font-mono', theme.font.mono);
  }

  // Apply style tokens
  if (theme.style?.borderWidth) {
    root.style.setProperty('--border-width', theme.style.borderWidth);
  }
  if (theme.style?.borderWidthLg) {
    root.style.setProperty('--border-width-lg', theme.style.borderWidthLg);
  }
  if (theme.style?.shadowGlow) {
    root.style.setProperty('--shadow-glow', theme.style.shadowGlow);
  }
  if (theme.style?.transitionFast) {
    root.style.setProperty('--transition-fast', theme.style.transitionFast);
  }
  if (theme.style?.transitionNormal) {
    root.style.setProperty('--transition-normal', theme.style.transitionNormal);
  }
  if (theme.style?.transitionSlow) {
    root.style.setProperty('--transition-slow', theme.style.transitionSlow);
  }

  // Set a data attribute for CSS targeting
  root.setAttribute('data-theme', theme.id);
}

/**
 * Clear theme-specific overrides and reset to CSS defaults.
 * Removes all CSS custom property overrides from document.documentElement
 * that were set by applyTheme.
 */
export function clearThemeOverrides(): void {
  const root = document.documentElement;
  const style = root.style;

  // Remove all custom properties (only the ones we set)
  const varsToRemove: string[] = [
    '--background',
    '--foreground',
    '--card',
    '--card-foreground',
    '--popover',
    '--popover-foreground',
    '--primary',
    '--primary-foreground',
    '--secondary',
    '--secondary-foreground',
    '--muted',
    '--muted-foreground',
    '--accent',
    '--accent-foreground',
    '--destructive',
    '--border',
    '--input',
    '--ring',
    '--radius',
    '--chart-1',
    '--chart-2',
    '--chart-3',
    '--chart-4',
    '--chart-5',
    '--sidebar',
    '--sidebar-foreground',
    '--sidebar-primary',
    '--sidebar-primary-foreground',
    '--sidebar-accent',
    '--sidebar-accent-foreground',
    '--sidebar-border',
    '--sidebar-ring',
    // Style tokens
    '--font-heading-family',
    '--border-width',
    '--border-width-lg',
    '--shadow-glow',
    '--transition-fast',
    '--transition-normal',
    '--transition-slow',
    '--panel-header',
    '--panel-header-foreground',
    '--decorative-accent',
  ];

  for (const v of varsToRemove) {
    style.removeProperty(v);
  }

  root.removeAttribute('data-theme');
}

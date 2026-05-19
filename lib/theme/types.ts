/**
 * Theme system type definitions for Foundry Companion.
 *
 * Each theme defines its own light and dark palette as CSS variable overrides.
 * The system applies them at runtime via style.setProperty() on document.documentElement.
 */
export interface ThemeDefinition {
  /** Unique identifier (kebab-case, e.g. 'dnd', 'custom-vault-42') */
  id: string;
  /** Human-readable name (e.g. 'D&D Style') */
  name: string;
  /** Short description */
  description?: string;
  /** Version number for migration purposes */
  version?: number;

  /** Font family overrides (falls back to current font if unset) */
  font?: {
    sans?: string;
    mono?: string;
    heading?: string;
  };

  /** Style / visual tokens beyond colours */
  style?: {
    /** Border width for standard borders (e.g. '1px', '2px') */
    borderWidth?: string;
    /** Thick border width for decorative borders (e.g. '2px', '3px') */
    borderWidthLg?: string;
    /** Glow shadow value for neon / accent glows (e.g. '0 0 20px oklch(...)') */
    shadowGlow?: string;
    /** Fast transition duration (e.g. '150ms') */
    transitionFast?: string;
    /** Normal transition duration (e.g. '250ms') */
    transitionNormal?: string;
    /** Slow transition duration (e.g. '400ms') */
    transitionSlow?: string;
  };

  /** Radius multiplier — 1.0 = default (0.625rem), 1.5 = rounder, 0.5 = sharper */
  radiusScale?: number;

  /** Branding assets */
  branding?: {
    /** URL or data URI for a logo */
    logo?: string;
    /** Favicon / PWA icon URL */
    icon?: string;
    /** Background pattern or gradient image URL */
    accentImage?: string;
  };

  /** Light mode CSS variable overrides */
  light: Record<string, string>;
  /** Dark mode CSS variable overrides */
  dark: Record<string, string>;
}

/**
 * All CSS variable names that a theme can override.
 * These map directly to the CSS custom properties in globals.css.
 */
export const THEME_VARIABLES = [
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
  /* Style tokens */
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
  /* Heading accent marker (e.g. D&D red square) */
  '--heading-accent-color',
  '--heading-accent-shape',
  /* Decorative borders & corners */
  '--corner-bracket-color',
  '--corner-bracket-style',
  '--border-double-color',
  '--border-bevel',
  /* Extended accents */
  '--accent-secondary',
  '--accent-secondary-foreground',
  /* Overlay & effects */
  '--glow-intensity',
  '--glass-blur',
  /* Typography treatments */
  '--heading-transform',
  '--mono-font',
  /* Overlay system — ::before texture */
  '--overlay-bg',
  '--overlay-blend',
  '--overlay-opacity',
  '--overlay-size',
  '--overlay-repeat',
  /* Vignette system — ::after gradient */
  '--vignette',
  '--vignette-dark',
  /* Card decorations (extend --card / --card-foreground) */
  '--card-override-bg',
  '--card-override-fg',
  '--card-texture',
  '--card-texture-blend',
  '--card-texture-size',
  '--card-border',
  '--card-shadow',
  /* Sidebar decorations */
  '--sidebar-texture',
  '--sidebar-texture-blend',
  '--sidebar-texture-size',
  '--sidebar-edge',
  '--sidebar-edge-inset',
  '--sidebar-edge-width',
  '--sidebar-edge-height',
] as const;

export type ThemeVariable = (typeof THEME_VARIABLES)[number];

/** All built-in theme preset IDs */
export const BUILTIN_THEMES = ['default', 'dnd', 'cyberpunk', 'warhammer', 'pathfinder'] as const;
export type BuiltinThemeId = (typeof BUILTIN_THEMES)[number];

/** A theme that has been saved (built-in or custom) */
export interface SavedTheme {
  id: string;
  name: string;
  description?: string;
  /** True for built-in presets, false for user-imported custom themes */
  builtin: boolean;
  /** Raw definition data (only stored for custom themes; builtins reference presets) */
  definition?: ThemeDefinition;
}

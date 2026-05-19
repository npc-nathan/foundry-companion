# Theme System — Foundry Companion

## Architecture Overview

```
ThemeProvider (next-themes wrapper + applyTheme)
    │
    ├── applies preset → CSS custom properties on <html>
    │       │
    │       ├── core shadcn vars (--background, --foreground, --primary, etc.)
    │       ├── sidebar vars (--sidebar, --sidebar-foreground, etc.)
    │       ├── decorative extras (--heading-accent-color, --corner-bracket-color, etc.)
    │       ├── card decorations (--card-override-bg, --card-texture, etc.)
    │       ├── sidebar decorations (--sidebar-texture, --sidebar-edge, etc.)
    │       └── style tokens (--shadow-glow, transition speeds, border widths)
    │
    ├── add data-theme="dnd|cyberpunk|warhammer|pathfinder" attribute
    │
    └── CSS cascade reads these custom properties →
            ├── globals.css decorative classes
            ├── component variant classes (card variant, dialog variant, sheet variant)
            └── utility glow classes (glow-sm, glow-md, glow-lg, glow-text)
```

## File Map

| File                                  | Purpose                                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `lib/theme/types.ts`                  | TypeScript types: `ThemeDefinition`, `ThemePalette`, `ThemeStyle`, `DecorativeVars`, etc. |
| `lib/theme/presets.ts`                | 5 built-in theme presets with full light/dark palettes                                    |
| `lib/theme/registry.ts`               | Browser storage CRUD for imported/custom themes                                           |
| `lib/theme/apply-theme.ts`            | Applies a `ThemeDefinition` to the DOM as CSS custom properties                           |
| `lib/theme/ThemeProvider.tsx`         | React context provider wrapping `next-themes` + `applyTheme`                              |
| `lib/theme/use-theme-variant.ts`      | Hook returning theme metadata (`themePreset`, `isDnd`, etc.)                              |
| `components/theme/ThemeSwitcher.tsx`  | Dropdown: pick preset, toggle dark/light, open Theme Manager                              |
| `components/theme/ThemeManager.tsx`   | Dialog: browse all presets, preview, import/export JSON, delete                           |
| `components/theme/heading-accent.tsx` | `<HeadingAccent>` component for inline heading decorations                                |

## Preset Themes

Each preset defines **68 CSS custom properties** across light and dark modes.

| Theme      | ID           | Vibe                     | Heading Font      | Accent Color  |
| ---------- | ------------ | ------------------------ | ----------------- | ------------- |
| Default    | `default`    | Clean shadcn neutral     | System sans-serif | Gray          |
| D&D Style  | `dnd`        | Parchment, leather, gold | Cinzel            | Amber/gold    |
| Cyberpunk  | `cyberpunk`  | Neon, chrome, dark       | Orbitron          | Magenta       |
| Warhammer  | `warhammer`  | Grimdark gothic          | Impact/black      | Blood red     |
| Pathfinder | `pathfinder` | Heraldic navy/purple     | Trajan Pro        | Indigo violet |

## Global CSS Custom Properties

### Core shadcn Vars (14)

`--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`,
`--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`,
`--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`,
`--accent-foreground`, `--destructive`, `--border`, `--input`, `--ring`,

### Chart Vars (5)

`--chart-1` through `--chart-5`

### Sidebar Vars (8)

`--sidebar`, `--sidebar-foreground`, `--sidebar-primary`,
`--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`,
`--sidebar-border`, `--sidebar-ring`

### Panel Vars (2)

`--panel-header`, `--panel-header-foreground`

### Decorative Extras (18)

| Variable                        | Purpose                                       |
| ------------------------------- | --------------------------------------------- |
| `--decorative-accent`           | Primary accent for decorations                |
| `--heading-accent-color`        | Color of heading marker shapes                |
| `--heading-accent-shape`        | Shape: `square` / `line` / `diamond` / `none` |
| `--corner-bracket-color`        | Card/dialog corner bracket color              |
| `--corner-bracket-style`        | Style: `simple` / `ornate` / `none`           |
| `--border-double-color`         | Double border color                           |
| `--border-bevel`                | Bevel style: `rounded` / `sharp` / `bevel-45` |
| `--accent-secondary`            | Secondary accent color                        |
| `--accent-secondary-foreground` | Text on secondary accent                      |
| `--glow-intensity`              | Glow brightness (0.0 - 1.0)                   |
| `--glass-blur`                  | Backdrop blur for glass panels                |
| `--heading-transform`           | `none` / `uppercase` / `small-caps`           |
| `--overlay-bg`                  | Background overlay texture                    |
| `--overlay-blend`               | Blend mode for overlay                        |
| `--overlay-opacity`             | Overlay opacity                               |
| `--overlay-size`                | Overlay background-size                       |
| `--overlay-repeat`              | Overlay background-repeat                     |
| `--vignette`                    | Vignette effect (light mode)                  |
| `--vignette-dark`               | Vignette effect (dark mode)                   |
| `--mono-font`                   | Monospace font family fallback                |

### Card Decorations (6)

| Variable               | Purpose                  |
| ---------------------- | ------------------------ |
| `--card-override-bg`   | Card background override |
| `--card-override-fg`   | Card foreground override |
| `--card-border`        | Card border style        |
| `--card-shadow`        | Card shadow style        |
| `--card-texture`       | Card texture background  |
| `--card-texture-blend` | Card texture blend mode  |
| `--card-texture-size`  | Card texture size        |

### Sidebar Decorations (7)

| Variable                  | Purpose                    |
| ------------------------- | -------------------------- |
| `--sidebar-texture`       | Sidebar texture background |
| `--sidebar-texture-blend` | Sidebar texture blend mode |
| `--sidebar-texture-size`  | Sidebar texture size       |
| `--sidebar-texture-bg`    | Sidebar background color   |
| `--sidebar-edge`          | Sidebar edge decoration    |
| `--sidebar-edge-inset`    | Edge positioning           |
| `--sidebar-edge-width`    | Edge width                 |
| `--sidebar-edge-height`   | Edge height                |

### Preset Style Tokens (6)

Set in the `style` block of each preset. Applied via `apply-theme.ts`.

| Token                 | Purpose                                  |
| --------------------- | ---------------------------------------- |
| `--shadow-glow`       | Glow effect color for `glow-*` utilities |
| `--border-width`      | Default border width                     |
| `--border-width-lg`   | Large border width                       |
| `--transition-fast`   | Fast transition duration                 |
| `--transition-normal` | Normal transition duration               |
| `--transition-slow`   | Slow transition duration                 |

## CSS Decoration Classes (`app/globals.css`)

### Heading Decorations

```css
.heading-accent                    /* Container for heading + marker */
.heading-accent::before            /* Marker pseudo-element (shape + color) */
.heading-accent-if-defined         /* Collapses marker when not in a theme */
html[data-theme] .heading-accent-if-defined  /* Restores marker in theme */
html[data-theme="dnd"] .heading-accent-if-defined  /* Per-theme shape override */
html[data-theme="cyberpunk"] .heading-accent-if-defined  /* Line shape */
html[data-theme="warhammer"] .heading-accent-if-defined  /* Square shape */
html[data-theme="pathfinder"] .heading-accent-if-defined  /* Diamond shape */
.heading-themed                    /* Heading font + transform */
```

### Surface Decorations

```css
.corner-brackets                   /* Top-left/bottom-right L-brackets */
.glass-panel                       /* Backdrop blur + translucent bg */
.border-double                     /* Double border line */
.border-bevel-sharp                /* Octagonal clip-path corners */
.border-bevel-45                   /* 45° beveled corners */
```

### Glow Utilities (Tailwind v4 utilities)

```css
@utility glow-sm {
  box-shadow: 0 0 12px 4px var(--shadow-glow);
}
@utility glow-md {
  box-shadow: 0 0 20px 8px var(--shadow-glow);
}
@utility glow-lg {
  box-shadow: 0 0 30px 16px var(--shadow-glow);
}
@utility glow-text {
  text-shadow: 0 0 8px var(--shadow-glow);
}
```

Usage: `hover:glow-sm`, `glow-sm`, `focus-visible:glow-sm` etc.

### Universal Focus-visible

```css
*:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  box-shadow: 0 0 8px 2px color-mix(in oklch, var(--shadow-glow) 60%, transparent);
}
```

### Vignette

```css
html::after {
  background: radial-gradient(ellipse at center, transparent 50%, ...);
  pointer-events: none;
}
```

### Scanline Animation (Cyberpunk only)

```css
html[data-theme='cyberpunk']::after {
  background: repeating-linear-gradient(...);
  animation: scanline 4s linear infinite;
}
```

## Components Using `data-slot` Attributes

| `data-slot`  | Element       | Decorations Applied                                     |
| ------------ | ------------- | ------------------------------------------------------- |
| `card`       | `Card.tsx`    | Texture, border, shadow, font-family                    |
| `card-title` | Card title    | Heading font                                            |
| `sidebar`    | `sidebar.tsx` | Texture, background-color, edge decoration, font-family |

## Component Variant System

Card, Dialog, and Sheet accept a `variant` prop that maps to CSS classes:

| Variant       | CSS Class            | Effect                                           |
| ------------- | -------------------- | ------------------------------------------------ |
| `default`     | (none)               | Standard shadcn look                             |
| `brackets`    | `corner-brackets`    | Corner L-brackets using `--corner-bracket-color` |
| `glass`       | `glass-panel`        | Frosted glass using `--glass-blur`               |
| `double`      | `border-double`      | Double border using `--border-double-color`      |
| `bevel-sharp` | `border-bevel-sharp` | Sharp beveled edges                              |
| `bevel-45`    | `border-bevel-45`    | 45° beveled edges                                |

## Glow Wiring

| Element                 | When                    | Class                            |
| ----------------------- | ----------------------- | -------------------------------- |
| Sidebar active nav link | Always on active page   | `glow-sm`                        |
| Default button          | On hover                | `hover:glow-sm`                  |
| Destructive button      | On hover                | `hover:glow-sm`                  |
| All focusable elements  | On keyboard focus (Tab) | Universal `*:focus-visible` rule |

## Built-in Textures (SVG Data URIs in `globals.css`)

| Variable                 | Theme      | Description                                     |
| ------------------------ | ---------- | ----------------------------------------------- |
| `--bg-texture-parchment` | D&D        | Fine paper grain overlay (SVG feTurbulence)     |
| `--bg-texture-grid`      | Cyberpunk  | Neon grid pattern (horizontal + vertical lines) |
| `--bg-texture-grunge`    | Warhammer  | Dark noise texture                              |
| `--bg-texture-sparkle`   | Pathfinder | Subtle star/sparkle pattern                     |

## Theme Icon SVGs

Located in `/public/icons/`:

| File                  | Used By                      |
| --------------------- | ---------------------------- |
| `dnd-icon.svg`        | D&D preset (`branding.icon`) |
| `cyberpunk-icon.svg`  | Cyberpunk preset             |
| `warhammer-icon.svg`  | Warhammer preset             |
| `pathfinder-icon.svg` | Pathfinder preset            |

## How to Add a New Theme

1. Open `lib/theme/presets.ts`
2. Add a new entry to `presetThemes` with the same shape as the others:
   - `id`, `name`, `description`
   - `font` block (heading, optional mono)
   - `style` block (borderWidth, shadowGlow, transition speeds)
   - Optional `radiusScale`, `branding.icon`
   - `light` palette (68 vars) — copy from an existing theme and adjust
   - `dark` palette (68 vars) — copy and adjust
3. No other files need changes. The `ThemeSwitcher` dropdown automatically populates from `presetThemes`.
4. Optionally add a theme icon SVG at `/public/icons/<id>-icon.svg`.
5. If the theme needs unique CSS shapes, add rules to `globals.css` for `html[data-theme="<id>"] .heading-accent-if-defined::before` etc.

## Importing/Exporting Themes

The `ThemeManager` component supports importing and exporting themes as JSON files. The JSON schema matches the `ThemeDefinition` type from `lib/theme/types.ts`. All 5 built-in presets are exportable (export from ThemeManager → save as JSON → share or backup).

## Theme Persistence

- Selected preset is stored in `localStorage` by `next-themes` (via `ThemeProvider`)
- `data-theme` attribute on `<html>` drives CSS cascade
- Imported/custom themes are stored in `localStorage` via `registry.ts`
- Dark/light mode toggle is independent of theme preset — any preset works in either mode

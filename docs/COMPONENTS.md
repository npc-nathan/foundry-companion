# Component Architecture

> Routing, layout hierarchy, and component tree.

---

## Routing Structure

```
app/
├── layout.tsx                  # Root layout: dark class, Geist font, Providers
├── page.tsx                    # Auto-redirect: /gm or /player based on role
├── api/
│   ├── relay/[...path]/route.ts    # Universal relay proxy
│   ├── store-auth/route.ts         # Cookie-based auth storage
│   └── chat-upload/route.ts        # Image upload for chat
├── gm/
│   ├── layout.tsx              # ConnectionGate + AppShell + Sidebar
│   ├── page.tsx                # GM dashboard (stats overview)
│   ├── actors/
│   │   ├── page.tsx            # Actor list with search
│   │   └── [id]/page.tsx       # Character sheet (D&D 5e)
│   ├── canvas/page.tsx         # Interactive scene viewer (SVG)
│   ├── chat/page.tsx           # Chat with IC/OOC/Whisper + UserList
│   ├── combat/page.tsx         # Combat tracker
│   ├── compendium/page.tsx     # Reference browser
│   ├── dice/page.tsx           # Dice roller + D&D 5e shortcuts
│   ├── journals/page.tsx       # Journal editor
│   ├── macros/page.tsx         # Code + Node editor
│   ├── rolltables/page.tsx     # Roll table viewer
│   └── scenes/page.tsx         # Scene gallery
└── player/
    ├── layout.tsx              # ConnectionGate + AppShell (no Sidebar)
    ├── page.tsx                # Player dashboard
    ├── character/page.tsx      # Character sheet (actor selector)
    ├── chat/page.tsx           # Read-only chat
    └── dice/page.tsx           # Dice roller
```

## Layout Chain

```
Root Layout (app/layout.tsx)
├── <html class="dark">
│   └── <body>
│       └── <Providers>
│           ├── ThemeProvider (next-themes)
│           └── QueryClientProvider (TanStack React Query)
│               └── {children}
│
├── GM Layout (app/gm/layout.tsx)
│   └── <ConnectionGate>
│       └── <AppShell>
│           └── <Sidebar />
│               └── {page content}
│
└── Player Layout (app/player/layout.tsx)
    └── <ConnectionGate>
        └── <AppShell>
            └── {page content}
```

### Root Layout (`app/layout.tsx`)

- Sets `<html class="dark">` for dark mode default
- Imports Geist font (sans + mono)
- Wraps children in `<Providers>`

### Providers (`components/providers.tsx`)

- `ThemeProvider` — next-themes for dark/light mode
- `QueryClientProvider` — TanStack React Query with configured defaults

### Connection Gate (`components/connection-gate.tsx`)

- Connection/login flow: relay URL + API key entry
- Health check before establishing connection
- Shows loading/error/connected states
- Redirects to login if not authenticated
- Role-based routing after connection

### App Shell (`components/app-shell.tsx`)

- Responsive layout wrapper
- Manages sidebar state (open/closed)
- Contains top-level error boundary
- GM layout includes `<Sidebar />`, player layout does not

### Sidebar (`components/sidebar.tsx`)

- Dynamic navigation sidebar
- Shows GM-specific links (Scenes, Actors, Combat, Chat, Dice, Journals, Macros)
- Collapsible
- Active route highlighting

---

## Page Component Details

### GM Dashboard (`/gm`)

- Stats overview: actor count, scene count, combat status, journal count
- Uses React Query with auto-refresh

### Actor List (`/gm/actors`)

- Search/filter interface
- Links to individual actor sheets

### Canvas (`/gm/canvas`)

- Interactive scene viewer (`components/scene-canvas.tsx`)
- SVG-based pan/zoom
- Token display, grid overlay, wall rendering
- Distance measurement tool

### Combat Tracker (`/gm/combat`)

- Encounter management
- Initiative tracking
- HP controls (damage/heal)
- Turn/round advancement

### Macro Editor (`/gm/macros`)

- Dual-tab: Code Editor + Node Builder
- CodeMirror 6 for code editing
- React Flow for visual node building
- Expression builder dialog

### Character Sheet (`/gm/actors/[id]`, `/player/character`)

- See [CHARACTER-SHEET.md](./CHARACTER-SHEET.md)
- Full D&D 5e sheet with tabs

---

## UI Component Library (`components/ui/`)

Based on shadcn/ui. Exports standard primitives:

| Component  | File              | Description                                                     |
| ---------- | ----------------- | --------------------------------------------------------------- |
| Button     | `button.tsx`      | Variants: default, destructive, outline, secondary, ghost, link |
| Card       | `card.tsx`        | Card, CardHeader, CardTitle, CardContent, CardFooter            |
| Input      | `input.tsx`       | Text input with error styling                                   |
| Badge      | `badge.tsx`       | Variants: default, secondary, destructive, outline              |
| Dialog     | `dialog.tsx`      | Modal dialog with overlay                                       |
| Select     | `select.tsx`      | Dropdown select                                                 |
| Tabs       | `tabs.tsx`        | Tab navigation                                                  |
| Sheet      | `sheet.tsx`       | Slide-out panel                                                 |
| Separator  | `separator.tsx`   | Horizontal/vertical divider                                     |
| ScrollArea | `scroll-area.tsx` | Custom scroll container                                         |
| Tooltip    | `tooltip.tsx`     | Hover tooltip                                                   |
| Label      | `label.tsx`       | Form label                                                      |
| Sonner     | `sonner.tsx`      | Toast notifications                                             |

## Key Shared Components

| Component      | File                                  | Purpose                                                  |
| -------------- | ------------------------------------- | -------------------------------------------------------- |
| ErrorBoundary  | `components/ErrorBoundary.tsx`        | Catches React errors, shows fallback, reports to webhook |
| UUIDLinkViewer | `components/uuid-link-viewer.tsx`     | Renders Foundry UUID references as clickable links       |
| ThemeSwitcher  | `components/theme/ThemeSwitcher.tsx`  | Theme selection UI                                       |
| ThemeManager   | `components/theme/ThemeManager.tsx`   | Advanced theme customization                             |
| HeadingAccent  | `components/theme/heading-accent.tsx` | Decorative heading markers                               |

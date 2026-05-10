# Foundry Companion — Architecture Guide

## Overview

Foundry Companion is a **multi-role companion web app** for Foundry Virtual Tabletop (VTT). It provides remote access to Foundry data and tools through a **relay server** proxy, enabling GMs and players to interact with their games outside the Foundry client.

The app follows **Next.js 16 App Router** conventions with a clear separation between GM and Player sections, protected by a connection gate that handles authentication and client selection.

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                     │
│                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────┐  │
│  │  Zustand      │   │  React Query │   │  SSE       │  │
│  │  (Config +    │   │  (Server     │   │  Manager   │  │
│  │   Status)     │   │   State)     │   │  (Events)  │  │
│  └──────────────┘   └──────┬───────┘   └─────┬──────┘  │
│                            │                  │         │
│                     ┌──────▼──────────────────▼─────┐   │
│                     │   /api/relay/[...path] Proxy  │   │
│                     └───────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                              │
                              │ HTTP + SSE
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    Relay Server                          │
│  (Translates HTTP requests ↔ Foundry VTT Socket.IO)     │
│  - Handles auth (x-api-key)                              │
│  - Manages client connections                            │
│  - Streams SSE events                                    │
└─────────────────────────────────────────────────────────┘
                              │
                              │ Socket.IO
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    Foundry VTT                           │
│  - Game data (actors, scenes, items, etc.)              │
│  - Combat encounters                                    │
│  - Dice rolls                                           │
│  - Chat messages                                        │
│  - Real-time hooks                                      │
└─────────────────────────────────────────────────────────┘
```

---

## Request Lifecycle

1. **Client** makes a request via `lib/relay.ts` → fetches `/api/relay/<endpoint>`
2. **Next.js API Route** (`app/api/relay/[...path]/route.ts`) receives the request, adds auth headers from cookies/Zustand, forwards to the relay server
3. **Relay Server** processes the request, translates it to Foundry Socket.IO calls, returns the response
4. **Response** flows back through the proxy to the client

### SSE Lifecycle

1. **ConnectionGate** subscribes to SSE endpoints after successful authentication
2. **SSE Manager** (`lib/sse.ts`) connects via `fetch()` + `ReadableStream` (supports auth headers, unlike native `EventSource`)
3. Events are dispatched to React Query callbacks that invalidate relevant query caches
4. Auto-reconnect with exponential backoff (max 10 retries, base delay 2s)

---

## Routing Structure

### App Router Layout

```
Root Layout (app/layout.tsx)
├── Dark theme enforced, Geist font
├── Providers (ThemeProvider, QueryClientProvider)
│
├── / → Landing (auto-redirects based on role)
│
├── /gm/* → GM Section
│   └── GM Layout (app/gm/layout.tsx)
│       ├── ConnectionGate (auth guard)
│       ├── AppShell (responsive shell)
│       │   ├── Sidebar (navigation)
│       │   └── Content area
│       │
│       ├── /gm/ → Dashboard
│       ├── /gm/actors → Actor list
│       ├── /gm/actors/[id] → Character sheet
│       ├── /gm/canvas → Scene viewer
│       ├── /gm/chat → Chat
│       ├── /gm/combat → Combat tracker
│       ├── /gm/dice → Dice roller
│       ├── /gm/journals → Journal editor
│       ├── /gm/macros → Macro editor (Code + Node)
│       └── /gm/scenes → Scene gallery
│
└── /player/* → Player Section
    └── Player Layout (app/player/layout.tsx)
        ├── ConnectionGate (auth guard)
        ├── AppShell (responsive shell)
        └── /player/ → Dashboard
            ├── /player/character → Character sheet
            ├── /player/chat → Chat
            └── /player/dice → Dice roller
```

---

## State Management

### Three-Layer Architecture

| Layer | Technology | Persistence | Purpose |
|-------|-----------|-------------|---------|
| **Config** | Zustand + `persist` middleware | localStorage | Relay URL, API key, role, theme |
| **Connection** | Zustand (runtime) | In-memory | Connected/connecting/error status |
| **Server Data** | TanStack React Query | In-memory (cached) | Actors, scenes, combat, chat, etc. |

### Zustand Store (`lib/store.ts`)

```
Config (persisted):
├── relayUrl: string
├── apiKey: string
├── clientId: string
├── clientName: string
├── role: 'gm' | 'player'

UI (persisted):
├── sidebarOpen: boolean
├── theme: 'dark' | 'light'

Status (runtime):
├── connected: boolean
├── online: boolean
├── connecting: boolean
├── error: string | null
```

### React Query Configuration

Most queries use:
- `refetchInterval`: 3-30s depending on data volatility
- `staleTime`: Matches or exceeds refetch interval
- `gcTime`: 5 minutes default
- SSE-driven invalidation for real-time updates

---

## Component Hierarchy

```
Providers (components/providers.tsx)
└── ThemeProvider (dark forced)
    └── QueryClientProvider
        └── ConnectionGate (components/connection-gate.tsx)
            └── AppShell (components/app-shell.tsx)
                ├── Sidebar (components/sidebar.tsx)
                │   ├── GM Nav: Dashboard, Actors, Scenes, Canvas, Combat, Chat, Dice, Journals, Macros
                │   └── Player Nav: Dashboard, Character, Chat, Dice
                │
                └── [Page Content]
                    ├── Dashboard → Stats cards
                    ├── Actors → Search + Create / CharacterSheet
                    ├── SceneCanvas → SVG with pan/zoom/targeting
                    ├── Combat → Encounter list + turn tracker
                    ├── Chat → Message list + input
                    ├── Dice → Formula + D&D shortcuts
                    ├── Journals → Folder tree + editor
                    ├── Macros → CodeEditor + NodeEditor
                    └── Scenes → Grid of scene cards
```

---

## API Proxy Pattern

The file `app/api/relay/[...path]/route.ts` is a **catch-all route** that:

1. Receives all requests to `/api/relay/*`
2. Builds the relay URL from:
   - Cookie-stored relay URL (via `lib/store-auth.ts`)
   - Falls back to `http://localhost:3010`
3. Forwards request with auth headers (`x-api-key`, `x-client-id`)
4. For SSE: returns the response stream directly
5. For binary/image data: returns the blob with caching headers
6. For JSON: returns the parsed response

**Image Proxy**: The `store-auth` route stores relay credentials in cookies so `<img>` tags can load scene images through the proxy without JavaScript.

---

## Key Design Decisions

### Why SSE over WebSocket?
- Simpler protocol (HTTP-based, no upgrade handshake)
- Works through the proxy without additional infrastructure
- Supports auth headers via `fetch()` API
- One-directional (server → client) is sufficient for updates
- Auto-reconnect built in with exponential backoff

### Why Zustand + React Query instead of Redux?
- Zustand: Minimal boilerplate for config/connection state
- React Query: Automatic caching, deduplication, refetching for server data
- Separation of concerns: local state ≠ server state
- No need for selectors, reducers, or middleware

### Why CodeMirror 6?
- Modular architecture (only import needed features)
- Better performance than CodeMirror 5
- JS/TS syntax highlighting built in
- Dark theme support
- Active community and maintenance

### Why React Flow (@xyflow/react v12)?
- Purpose-built for node-based editors
- Built-in drag & drop, connection handling
- Custom node types, edge types, and controls
- Good TypeScript support
- Active development

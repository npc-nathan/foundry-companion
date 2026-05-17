# Foundry Companion

A companion web app for [Foundry Virtual Tabletop](https://foundryvtt.com) — providing remote GM tools and player-facing character management outside the Foundry client, connected via a relay/proxy server.

Built with **Next.js 16** (App Router), **React 19**, **TypeScript**, **Tailwind v4**, **Zustand**, **TanStack React Query**, **CodeMirror 6**, and **React Flow**.

---

## Features

### GM Tools

- **Dashboard** — Quick overview stats: actors, scenes, combat, journal entries
- **Actor Manager** — Search/filter actors, view/edit D&D 5e character sheets
- **Scene Gallery** — Activate/deactivate scenes, view backgrounds
- **Interactive Canvas** — Pan/zoom scene view with tokens, grid, walls, lights, targeting, distance measurement, drag-to-move
- **Combat Tracker** — Encounter management with HP controls, turn/round advancement, add/remove combatants
- **Chat** — Send/receive IC, OOC, and whisper messages
- **Dice Roller** — Roll any formula or use D&D 5e check/save/skill/death-save shortcuts
- **Journal Editor** — Browse folders, create/edit journals with rich page management
- **Macro Editor** — Dual-tab interface:
  - **Code Editor** — Full CodeMirror 6 with JS syntax highlighting, CRUD + execute
  - **Node Builder** — Visual macro builder using React Flow with drag-and-drop palette, expression builder, and code export

### Player Tools

- **Character Sheet** — D&D 5e stats, inventory, spells, features, rests, currency
- **Chat** — Read and send messages
- **Dice Roller** — Quick rolls

### Real-Time Updates

Server-Sent Events (SSE) via fetch + ReadableStream for:

- Encounter/combat updates
- Chat messages
- Scene changes
- Generic Foundry hooks

---

## Architecture

```
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐
│  Foundry VTT    │◄─────►│  Relay Server   │◄─────►│  Next.js Proxy   │
│  (Socket.IO)    │       │  (HTTP + SSE)   │       │  /api/relay/*    │
└─────────────────┘       └─────────────────┘       └────────┬─────────┘
                                                             │
                                                    ┌────────▼─────────┐
                                                    │  React Client    │
                                                    │  (Zustand + RQ)  │
                                                    └──────────────────┘
```

### Data Flow

1. **Authentication**: GM/Player enters relay URL + API key → health check → client selector → connect
2. **API Proxy**: All requests go through `/api/relay/[...path]` which forwards to the relay server with auth headers
3. **Server State**: TanStack React Query manages all server data with auto-refetch intervals
4. **Real-Time**: SSE manager subscribes to relay endpoints and invalidates React Query caches on events
5. **Image Proxy**: Binary assets (scene images) use the relay proxy directly; cookies handle auth for `<img>` tags

### State Layers

| Layer       | Tool                | Purpose                                               |
| ----------- | ------------------- | ----------------------------------------------------- |
| Config      | Zustand (persisted) | relay URL, API key, role, UI preferences              |
| Connection  | Zustand (runtime)   | connected/connecting/error status                     |
| Server Data | React Query         | actors, scenes, combat, chat, rolls, journals, macros |
| Real-Time   | SSE Manager         | invalidates React Query caches                        |
| Local UI    | React useState      | component-specific state                              |

---

## Project Structure

```
foundry-companion/
├── app/
│   ├── api/
│   │   ├── relay/[...path]/route.ts    # Universal relay proxy
│   │   └── store-auth/route.ts         # Cookie-based auth storage
│   ├── gm/
│   │   ├── layout.tsx                  # ConnectionGate + AppShell + Sidebar
│   │   ├── page.tsx                    # GM dashboard
│   │   ├── actors/
│   │   │   ├── page.tsx                # Actor list with search
│   │   │   └── [id]/page.tsx           # Character sheet
│   │   ├── canvas/page.tsx             # Interactive scene viewer
│   │   ├── chat/page.tsx               # Chat with IC/OOC/Whisper
│   │   ├── combat/page.tsx             # Combat tracker
│   │   ├── dice/page.tsx               # Dice roller + D&D shortcuts
│   │   ├── journals/page.tsx           # Journal editor
│   │   ├── macros/page.tsx             # Code + Node macro editor
│   │   └── scenes/page.tsx             # Scene gallery
│   ├── player/
│   │   ├── layout.tsx                  # ConnectionGate + AppShell
│   │   ├── page.tsx                    # Player dashboard
│   │   ├── character/page.tsx          # Character sheet (actor selector)
│   │   ├── chat/page.tsx               # Read-only chat
│   │   └── dice/page.tsx               # Dice roller
│   ├── layout.tsx                      # Root layout (dark, Geist, Providers)
│   ├── page.tsx                        # Auto-redirect based on role
│   └── globals.css                     # Tailwind v4 + shadcn CSS
├── components/
│   ├── app-shell.tsx                   # Responsive layout shell
│   ├── sidebar.tsx                     # Dynamic nav sidebar
│   ├── connection-gate.tsx             # Login/connection flow
│   ├── scene-canvas.tsx                # SVG canvas viewer
│   ├── CharacterSheet.tsx              # D&D 5e character sheet
│   ├── providers.tsx                   # Theme + QueryClient providers
│   ├── macros/
│   │   ├── code-editor.tsx             # CodeMirror 6 editor wrapper
│   │   ├── node-editor.tsx             # React Flow node canvas
│   │   ├── expression-editor.tsx       # Condition builder dialog
│   │   └── data-edge.tsx               # Custom React Flow edge type
│   └── ui/                             # shadcn/ui components
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── sonner.tsx
│       └── tooltip.tsx
├── lib/
│   ├── relay.ts                # Central API client
│   ├── store.ts                # Zustand store (persisted)
│   ├── store-auth.ts           # Server-side cookie helpers
│   ├── sse.ts                  # SSE manager
│   ├── node-schemas.ts         # Node output type schemas
│   ├── module-mappings.ts      # Foundry module template library
│   └── utils.ts                # cn() utility
├── public/
│   ├── manifest.json           # PWA manifest
│   └── icons/                  # App icons
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── tsconfig.json
├── components.json             # shadcn/ui config
└── package.json
```

---

## Prerequisites

- **Node.js** 20.x or later
- **npm** 10.x or later
- A running **relay server** compatible with the Foundry Companion API

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

Then open http://localhost:3000 in your browser.

### Connecting

1. Enter your relay server URL (e.g., `http://localhost:3010`)
2. Enter your API key (configured on the relay server)
3. Select a Foundry client connection (if multiple are available)
4. You'll be redirected to the GM or Player dashboard

---

## Environment Variables

The app is configured via the connection UI at runtime, not through `.env` files. Configuration is persisted in localStorage under the key `foundry-companion`.

The relay URL defaults to `http://localhost:3010` if not configured.

---

## API Endpoints

The app communicates with a **relay server** that bridges HTTP requests to Foundry VTT's internal APIs. All endpoints are proxied through `/api/relay/[...path]` and require:

| Header        | Description                     |
| ------------- | ------------------------------- |
| `x-api-key`   | Relay server authentication key |
| `x-client-id` | Foundry client identifier       |

### Core Endpoints (via `lib/relay.ts`)

| Category              | Methods                                                                                                                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Health**            | `health()`                                                                                                                                                                                                                 |
| **Get/Update/Delete** | `get()`, `update()`, `delete()`, `create()`                                                                                                                                                                                |
| **Search**            | `search()`, `structure()`                                                                                                                                                                                                  |
| **Scenes**            | `getScene()`, `getSceneImage()`, `getSceneImageRaw()`, `activateScene()`                                                                                                                                                   |
| **Canvas**            | `getCanvasDocuments()`, `createCanvasDocument()`, `updateCanvasDocument()`, `deleteCanvasDocument()`, `getCanvasRegions()`                                                                                                 |
| **Tokens**            | `moveToken()`                                                                                                                                                                                                              |
| **Distance**          | `measureDistance()`                                                                                                                                                                                                        |
| **Combat**            | `encounters()`, `startEncounter()`, `nextTurn()`, `nextRound()`, `previousTurn()`, `previousRound()`, `endEncounter()`, `addCombatants()`, `removeCombatant()`                                                             |
| **Chat**              | `chat()`, `getChatMessages()`                                                                                                                                                                                              |
| **Rolls**             | `roll()`, `getRolls()`                                                                                                                                                                                                     |
| **D&D 5e**            | `dndAbilityCheck()`, `dndAbilitySave()`, `dndSkillCheck()`, `dndDeathSave()`, `dndShortRest()`, `dndLongRest()`, `dndEquipItem()`, `dndAttuneItem()`, `dndPrepareSpell()`, `dndModifyCurrency()`, `dndConcentrationSave()` |
| **Effects**           | `getActorEffects()`, `createEffect()`, `deleteEffect()`                                                                                                                                                                    |
| **Macros**            | `getMacros()`, `createMacro()`, `updateMacro()`, `deleteMacro()`, `executeMacro()`                                                                                                                                         |
| **Journals**          | `getJournals()`, `getJournal()`, `createJournal()`, `updateJournal()`, `deleteJournal()`                                                                                                                                   |
| **World**             | `worldInfo()`, `getClients()`, `getUsers()`                                                                                                                                                                                |
| **Execute**           | `executeJs()`                                                                                                                                                                                                              |

### SSE Endpoints

The SSE manager connects to these relay endpoints for real-time updates:

- `/encounters/subscribe` — Combat/encounter events
- `/chat/subscribe` — Chat message events
- `/scene/subscribe` — Scene change events
- `/hooks/subscribe` — All Foundry hooks

---

## D&D 5e Integration

The character sheet and dice roller include deep D&D 5e system support:

- **Abilities**: STR, DEX, CON, INT, WIS, CHA with modifiers and saving throws
- **Skills**: All 18 skills with proficiency/expertise bonuses
- **Combat**: HP with damage/heal controls, AC calculation, initiative
- **Spells**: Prepared/all known with slot tracking, concentration saves
- **Equipment**: Equip/unequip, attunement management
- **Resting**: Short rests (with optional HD) and long rests (with new day option)
- **Currency**: Modify coin amounts
- **Death Saves**: Track success/failure

---

## Macro System

### Code Editor

- Full CodeMirror 6 editor with line numbers, bracket matching, JS syntax highlighting
- Name, type (script/macro), and scope (global/actor) metadata
- Create, save, delete, and execute macros directly

### Node Builder (React Flow)

- Visual macro construction with draggable palette
- Node types: Roll Dice, Send Chat, Apply Effect, Conditions, Variables, Run Macro, Roll Table, Search for Actors/Targets/Scenes, Get HP
- Module integrations: DFreds Convenient Effects, DAE, Sequencer, FXMaster, Item Macro, Smart Target, Monk's Active Tiles, Dice So Nice, Wall Height, Levels, Automated Animations, Active Auras, Monk's Wall Enhancement, Dice Calculator
- Expression Editor: Build conditions with upstream data fields and operators
- Export Code: Generates Foundry-compatible JavaScript from graph

### Node Schemas

Each node type declares its output data schema (fields with types: string, number, boolean, actor, token, scene), enabling type-aware field pickers in the Expression Editor.

---

## Tech Stack

| Technology                 | Version       | Purpose                |
| -------------------------- | ------------- | ---------------------- |
| Next.js                    | 16.2.4        | Framework (App Router) |
| React                      | 19.2.4        | UI library             |
| TypeScript                 | ~5.7          | Type safety            |
| Tailwind CSS               | ^4.1          | Styling                |
| shadcn/ui                  | latest        | Component library      |
| Zustand                    | ^5.0          | State management       |
| TanStack React Query       | ^5.62         | Server state           |
| CodeMirror 6               | latest        | Code editor            |
| React Flow (@xyflow/react) | ^12.6         | Node graph editor      |
| Lucide React               | latest        | Icons                  |
| Sonner                     | latest        | Toast notifications    |
| clsx + tailwind-merge      | latest        | Class utilities        |
| Geist Font                 | via next/font | Typography             |

---

## Development

See **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** for a complete guide covering:

- **Code quality** — ESLint, Prettier, TypeScript setup
- **Pre-commit hooks** — what runs on every commit
- **Testing** — running tests, writing new ones, API contract vs component tests
- **Dependency auditing** — automated postinstall checks
- **Error monitoring** — ErrorBoundary + webhook setup
- **Bundle analysis** — one-off size investigation
- **Weekly tidy** — optional maintenance script
- **Playbooks** — common development workflows

Quick start:

```bash
npm run lint           # ESLint check
npm run format         # Prettier check
npm run type-check     # TypeScript
npm test               # All tests
```

---

## License

Foundry Companion is not affiliated with Foundry Virtual Tabletop. It requires a valid Foundry VTT license and a compatible relay server.

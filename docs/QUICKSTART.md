# Quickstart Guide

> Get Foundry Companion running in 7 steps.

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** (ships with Node.js)
- **Foundry VTT** instance with the [relay module](https://github.com/npc-it/foundryvtt-relay) installed
- **Relay server** running (separate service, connects to Foundry via Socket.IO)

## 1. Clone & Install

```bash
git clone <repo-url> foundry-companion
cd foundry-companion
npm install
```

## 2. Environment Setup

Create `.env.local` in the project root:

```env
# Required for GIF search in chat
NEXT_PUBLIC_TENOR_API_KEY=your_tenor_api_key_here
```

For integration tests, create `.env.test.local`:

```env
# Relay API key for integration tests
RELAY_API_KEY=your_relay_api_key_here
```

The relay API key is found in the `relay-auth` cookie from the browser.

## 3. Start Dev Server

```bash
npm run dev
```

Starts on `http://localhost:3000`.

## 4. Connect to Relay

1. Open the app in your browser
2. Enter the relay server URL (e.g. `http://localhost:8080`)
3. Enter your API key
4. Select a client name
5. Click "Connect"

The app will health-check the relay, then route you to the GM or player dashboard.

## 5. Verify It Works

Check the dashboard loads correctly:

```bash
curl http://localhost:3000
```

Run the test suite:

```bash
npm test
```

## 6. Available Scripts

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Start development server (port 3000) |
| `npm run build`      | Production build                     |
| `npm start`          | Start production server              |
| `npm test`           | Run all tests (Vitest)               |
| `npm run lint`       | ESLint check (50 warning max)        |
| `npm run lint:fix`   | Auto-fix ESLint issues               |
| `npm run format`     | Prettier check                       |
| `npm run format:fix` | Auto-format everything               |
| `npm run type-check` | TypeScript check (`tsc --noEmit`)    |
| `npm run analyze`    | Bundle size analysis                 |

## 7. Project Overview

```
foundry-companion/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes (relay proxy, auth, upload)
│   ├── gm/                 # GM tools (10 pages)
│   └── player/             # Player tools (3 pages)
├── components/             # React components
│   ├── character-sheet/    # D&D 5e character sheet (10 files)
│   ├── chat/               # Chat system (4 components)
│   ├── macros/             # Macro editor (4 components)
│   ├── theme/              # Theme system (3 components)
│   └── ui/                 # shadcn/ui primitives (14 components)
├── lib/                    # Core libraries
│   ├── relay.ts            # Relay API client
│   ├── store.ts            # Zustand global state
│   ├── sse.ts              # SSE manager
│   └── chat-types.ts       # Chat type definitions
├── docs/                   # Documentation
├── __tests__/              # Component + lib tests
└── tests/                  # Legacy + integration tests
```

## Next Steps

- [DEVELOPMENT.md](./DEVELOPMENT.md) — dev workflows, pre-commit hooks, auditing
- [TESTING.md](./TESTING.md) — full test guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system architecture overview
- [THEME-SYSTEM.md](./THEME-SYSTEM.md) — theme customization
- [MACROS.md](./MACROS.md) — macro editor guide

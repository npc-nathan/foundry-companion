# State Management (Zustand)

> Global application state — config, connection status, UI preferences, and chat routing.

---

## Store: `useStore`

Defined in `lib/store.ts`. Uses `zustand` with `persist` middleware.

### Persistence

The store persists `config` and `ui` to localStorage under key `foundry-companion`. Status and chat routing state are runtime-only (not persisted).

```ts
persist(
  (set, get) => ({ ... }),
  {
    name: 'foundry-companion',
    partialize: (state) => ({
      config: state.config,
      ui: state.ui,
    }),
  },
)
```

---

## State Shape

### Config (persisted)

```ts
interface Config {
  relayUrl: string; // Relay server URL (e.g. "http://localhost:8080")
  apiKey: string; // API key for relay authentication
  clientId: string; // Unique client identifier
  clientName: string; // Human-readable client name
  role: 'gm' | 'player'; // Active user role
  sessionId?: string; // Optional session identifier
}
```

### UI Config (persisted)

```ts
interface UIConfig {
  sidebarOpen: boolean; // Sidebar collapsed state
  theme: 'dark' | 'light'; // Color mode
  themePreset: string; // Active theme preset ID
}
```

### Status (runtime)

```ts
interface Status {
  connected: boolean; // SSE connection established
  online: boolean; // Relay server reachable
  connecting: boolean; // Connection in progress
  error: string | null; // Current error message
}
```

### Chat Routing (runtime)

```ts
activeUserDm: string | null;   // Active whisper target (user ID)
activePartyDm: Party | null;   // Active party whisper target
mutedUsers: string[];          // Muted user IDs
parties: Party[];              // Known parties
```

---

## Actions

### Config

| Action      | Signature                            | Description          |
| ----------- | ------------------------------------ | -------------------- |
| `setConfig` | `(partial: Partial<Config>) => void` | Merge partial config |

### Connection Status

| Action         | Signature                                                         | Description                       |
| -------------- | ----------------------------------------------------------------- | --------------------------------- |
| `setConnected` | `(connected: boolean) => void`                                    | Set connection state, clear error |
| `setStatus`    | `(status: 'connected' \| 'connecting' \| 'disconnected') => void` | Full status update                |
| `setError`     | `(error: string \| null) => void`                                 | Set error message                 |
| `reset`        | `() => void`                                                      | Reset config + status to defaults |

### UI

| Action           | Signature                  | Description                |
| ---------------- | -------------------------- | -------------------------- |
| `toggleSidebar`  | `() => void`               | Toggle sidebar open/closed |
| `toggleTheme`    | `() => void`               | Toggle dark/light mode     |
| `setThemePreset` | `(preset: string) => void` | Set active theme preset    |

### Chat Routing

| Action              | Signature                                   | Description                          |
| ------------------- | ------------------------------------------- | ------------------------------------ |
| `setActiveUserDm`   | `(userId: string \| null) => void`          | Set DM target (clears party DM)      |
| `setActivePartyDm`  | `(party: Party \| null) => void`            | Set party DM target (clears user DM) |
| `setMutedUsers`     | `(userIds: string[]) => void`               | Replace muted user list              |
| `toggleMuteUser`    | `(userId: string) => void`                  | Toggle a user's mute status          |
| `addParty`          | `(party: Party) => void`                    | Add a party                          |
| `removeParty`       | `(partyId: string) => void`                 | Remove a party                       |
| `addPartyMember`    | `(partyId: string, userId: string) => void` | Add member to party                  |
| `removePartyMember` | `(partyId: string, userId: string) => void` | Remove member from party             |

---

## State Layers

| Layer        | Tool           | Persisted | Purpose                            |
| ------------ | -------------- | --------- | ---------------------------------- |
| Config       | Zustand        | ✅        | relay URL, API key, role, UI prefs |
| Connection   | Zustand        | ❌        | connected/connecting/error status  |
| Chat Routing | Zustand        | ❌        | DM targets, parties, mutes         |
| Server Data  | React Query    | ❌        | actors, scenes, combat, chat       |
| Real-Time    | SSE Manager    | ❌        | invalidates React Query caches     |
| Local UI     | React useState | ❌        | component-specific state           |

## Auth Store

Defined in `lib/store-auth.ts`. Separate store for authentication flow state (token management, login session state).

```ts
import { useAuthStore } from '@/lib/store-auth';
```

## Defaults

```ts
const defaultConfig = {
  relayUrl: '',
  apiKey: '',
  clientId: '',
  clientName: '',
  role: 'gm',
};

const defaultUi = {
  sidebarOpen: true,
  theme: 'dark',
  themePreset: 'default',
};

const defaultStatus = {
  connected: false,
  online: false,
  connecting: false,
  error: null,
};
```

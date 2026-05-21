# Real-Time Updates (SSE)

> Server-Sent Events manager for live relay data.

---

## Overview

The SSE manager (`lib/sse.ts`) provides real-time event streaming from the relay server. It uses `fetch()` + `ReadableStream` instead of the browser `EventSource` API so auth headers can be sent through the proxy.

## Manager: `sseManager`

Singleton instance exported from `lib/sse.ts`:

```ts
import { sseManager } from '@/lib/sse';
```

## SSE Endpoints

All endpoints require `?clientId=<id>` query param and `x-api-key` header.

| Endpoint                    | Source Name | Events                                         |
| --------------------------- | ----------- | ---------------------------------------------- |
| `GET /hooks/subscribe`      | `hook`      | All Foundry hooks (combat, actor, scene, etc.) |
| `GET /encounters/subscribe` | `encounter` | Combat/encounter changes                       |
| `GET /actor/subscribe`      | `actor`     | Actor updates (requires `actorUuid`)           |
| `GET /scene/subscribe`      | `scene`     | Scene changes                                  |
| `GET /chat/subscribe`       | `chat`      | New chat messages                              |
| `GET /rolls/subscribe`      | `rolls`     | Dice roll results                              |

## Event Types

```ts
type SSEEvent =
  | { type: 'encounter'; data: unknown }
  | { type: 'chat'; data: unknown }
  | { type: 'scene'; data: unknown }
  | { type: 'hook'; data: unknown }
  | { type: 'rolls'; data: unknown }
  | { type: 'connected'; data: { clients: number } };
```

## API

### `subscribe(source, relayUrl, apiKey, clientId)`

Subscribe to an SSE event source. Idempotent — calling subscribe twice for the same source is a no-op.

```ts
sseManager.subscribe('chat', relayUrl, apiKey, clientId);
sseManager.subscribe('encounter', relayUrl, apiKey, clientId);
```

### `unsubscribe(source)`

Unsubscribe from a specific source. Aborts the active connection.

```ts
sseManager.unsubscribe('chat');
```

### `listen(callback)`

Register an event listener. Returns an unsubscribe function.

```ts
const unsub = sseManager.listen((event) => {
  console.log('SSE event:', event.type, event.data);
});
```

### `disconnectAll()`

Disconnect all SSE connections and clear all listeners. Used on logout.

```ts
sseManager.disconnectAll();
```

---

## Reconnection

Auto-reconnect with exponential backoff:

| Attempt  | Delay | Total elapsed |
| -------- | ----- | ------------- |
| 1        | 2s    | 2s            |
| 2        | 3s    | 5s            |
| 3        | 4.5s  | ~10s          |
| 4        | 6.75s | ~17s          |
| ...      | ...   | ...           |
| 10 (max) | ~115s | ~340s         |

**Max retries**: 10 (`MAX_RETRIES`)
**Base delay**: 2 seconds (`BASE_DELAY`)
**Backoff formula**: `delay = BASE_DELAY * 1.5^retryCount`

Retry counter resets on successful connection.

---

## Connection Architecture

```
Client                      Next.js Proxy                 Relay Server
  │                              │                             │
  │  sseManager.subscribe()      │                             │
  │ ───────────────────────────► │                             │
  │                              │  GET /hooks/subscribe       │
  │                              │ ───────────────────────────►│
  │                              │                             │
  │                              │  ◄── SSE stream ───────────│
  │  ReadableStream              │                             │
  │  ◄───────────────────────────│                             │
  │                              │                             │
  │  parse "data: {...}" lines  │                             │
  │   → dispatch(event)          │                             │
  │   → listeners fire           │                             │
```

The proxy URL is always:

```
/api/relay/<endpoint>/subscribe?clientId=<id>
```

---

## React Query Integration

The SSE manager is wired to invalidate React Query caches when events arrive:

```
Event received → infer type → invalidate matching query keys
  ├── 'encounter' → invalidate ['encounters'] + ['combatants']
  ├── 'chat'      → invalidate ['chat-messages']
  ├── 'scene'     → invalidate ['scenes'] + ['current-scene']
  ├── 'rolls'     → invalidate ['recent-rolls']
  └── 'hook'      → invalidate ['world-summary'] (generic catch-all)
```

This ensures the UI stays in sync with Foundry state without polling.

---

## SSE Protocol Parsing

Messages follow the standard SSE format:

```
data: {"type":"chat","data":{"message":"Hello!","user":"abc123"}}

```

Parsing flow:

1. Buffer accumulates raw chunks from `ReadableStream`
2. Split on `\n\n` (SSE message boundary)
3. For each message, extract lines starting with `data: `
4. Parse the JSON payload
5. Infer event type from the source name
6. Dispatch to all registered listeners

## Usage Example

```tsx
import { useEffect } from 'react';
import { sseManager } from '@/lib/sse';
import { useStore } from '@/lib/store';
import { useQueryClient } from '@tanstack/react-query';

function useSSE() {
  const { config } = useStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!config.apiKey || !config.clientId) return;

    sseManager.subscribe('chat', config.relayUrl, config.apiKey, config.clientId);
    sseManager.subscribe('encounter', config.relayUrl, config.apiKey, config.clientId);

    const unsub = sseManager.listen((event) => {
      if (event.type === 'chat') queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      if (event.type === 'encounter') queryClient.invalidateQueries({ queryKey: ['encounters'] });
    });

    return () => {
      unsub();
      sseManager.disconnectAll();
    };
  }, [config.apiKey, config.clientId]);
}
```

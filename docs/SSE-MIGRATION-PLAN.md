# SSE Migration Plan

> Based on actual relay REST API docs at `/home/talos/mount/mounted_drive/docker/foundryvtt-rest-api-relay/docs/`
> Generated: 2025-05-01

## Confirmed SSE Endpoints (from real relay docs)

| SSE Endpoint | Events Emitted | Filter Params | Status |
|-------------|---------------|---------------|--------|
| `GET /hooks/subscribe` | All Foundry hooks | `hooks` (comma-separated hook names), `encounterId`, `actorUuid`, `sceneId` | ✅ REAL |
| `GET /chat/subscribe` | `chat-create`, `chat-update`, `chat-delete` | `speaker`, `type`, `whisperOnly`, `userId` | ✅ REAL |
| `GET /encounters/subscribe` | Encounter events | `encounterId`, `hooks` | ✅ REAL |
| `GET /actor/subscribe` | Actor-specific events | `actorUuid` (required) | ✅ REAL |
| `GET /scene/subscribe` | Scene-specific events | `sceneId`, `hooks` | ✅ REAL |
| `GET /rolls/subscribe` | `roll` events | `userId` | ✅ REAL |

## Current Subscriptions vs Reality

`lib/sse.ts` currently defines these source types and maps them to endpoints:
- `encounter` → `/encounters/subscribe` ✅ Correct
- `chat` → `/chat/subscribe` ✅ Correct
- `scene` → `/scene/subscribe` ✅ Correct
- `hook` → **NOT subscribed** ❌ — listener handles it but no subscription created
- `rolls` → **NOT subscribed** ❌ — not defined as source type at all

### sse.ts Bugs & Misconceptions

1. **Missing source types**: `rolls`, `hooks` are not in the source mapping
2. **`inferType()` is incomplete**: Maps to `encounter`, `chat`, `scene`, or `hook` — no `rolls` type
3. **Listener handles `hook` events but no subscription exists**: `providers.tsx` has `case 'hook':` handler but no subscription to `/hooks/subscribe`
4. **Chat events not from hooks**: Chat events come from `/chat/subscribe`, not `/hooks/subscribe`

## Current Polling Inventory

| Source | Page(s) | Interval | SSE Endpoint | Coverage |
|--------|---------|----------|-------------|----------|
| Chat messages | `gm/chat`, `player/chat` | **3s** | `GET /chat/subscribe` | ✅ Already subscribed |
| Encounters | `gm/combat`, `gm/page` | **5s, 10s** | `GET /encounters/subscribe` | ✅ Already subscribed |
| Rolls | `gm/dice`, `player/dice` | **5s, 30s** | `GET /rolls/subscribe` | ❌ Not subscribed |
| Canvas scene + tokens | `gm/canvas` | **30s, 8s** | `GET /scene/subscribe` + `/hooks/subscribe` | Partially subscribed (scene only) |
| Character data | `CharacterSheet` (gm/actors/[id], player/character) | **15s** | `GET /actor/subscribe` (per-UUID) | ❌ Not subscribed |
| Actor effects | `CharacterSheet` | **15s** | `GET /actor/subscribe` (included) | ❌ Not subscribed |
| Structure | `gm/page`, `gm/scenes`, `player/page`, `player/character` | **30s** | `GET /hooks/subscribe` | ❌ Not subscribed |
| Macros | `gm/macros` | **30s** | `GET /hooks/subscribe` | ❌ Not subscribed |
| Journals | `gm/journals` | **30s** | `GET /hooks/subscribe` | ❌ Not subscribed |
| Users | `gm/chat`, `gm/page` | **15s** | None | ❌ No SSE for user presence |
| Session stats | `gm/page` | **15s** | None | ❌ No SSE for sessions |

## Known Polling Behavior (cannot replace with SSE)

| Data | Reason |
|------|--------|
| User presence/online status | No `/users/subscribe` endpoint in relay |
| Session stats (`/session`) | No SSE for session data |
| Canvas token positions | Partially — hooks SSE fires for token updates via Foundry hooks, but polling may still be needed for edge cases |

## Migration Phases

### Phase 0 — Fix Existing SSE Infrastructure (15 min)

**Problem**: We have SSE endpoints available but don't subscribe to them.

**Changes**:
1. `lib/sse.ts`: Add `rolls` and `hooks` as recognized source types in `inferType()` and `connect()`
2. `lib/sse.ts`: Fix endpoint mapping — `hooks` should connect to `/hooks/subscribe`
3. `components/connection-gate.tsx`: Subscribe to `rolls` and `hooks` SSE
4. `components/providers.tsx`: Handle `rolls` events in the listener

**Impact**: Enables SSE for rolls (5s/30s), structure (30s), macros (30s), journals (30s), character data (15s), effects (15s), token updates

### Phase 1 — Remove Polling on SSE-Covered Queries (30 min)

**After Phase 0 is tested**, remove `refetchInterval` from queries covered by SSE:

| Page | Query | Current Interval | Action |
|------|-------|-----------------|--------|
| `gm/chat` | chat-messages | 3s | Keep SSE (already works via existing subscription) |
| `player/chat` | chat-messages | 3s | Same |
| `gm/chat` | users | 15s | Reduce to 60s fallback (no SSE) |
| `gm/combat` | encounters | 5s | Remove refetchInterval (SSE + manual invalidation) |
| `gm/page` | structure | 30s | Remove refetchInterval (hooks SSE) |
| `gm/page` | encounters | 10s | Remove refetchInterval (encounter SSE) |
| `gm/page` | session | 15s | Reduce to 60s fallback (no SSE for it) |
| `gm/canvas` | scene+tokens+walls | 30s | Remove refetchInterval (scene SSE + hooks) |
| `gm/canvas` | token refresh | 8s | Remove refetchInterval (hooks SSE for token changes) |
| `gm/dice` | rolls | 5s | Remove refetchInterval (rolls SSE) |
| `gm/macros` | macros | 30s | Remove refetchInterval (hooks SSE) |
| `gm/journals` | journals | 30s | Remove refetchInterval (hooks SSE) |
| `gm/scenes` | structure | 30s | Remove refetchInterval (hooks SSE) |
| `player/dice` | rolls | 30s | Remove refetchInterval (rolls SSE) |
| `player/page` | structure | 30s | Remove refetchInterval (hooks SSE) |
| `player/character` | structure | 30s | Remove refetchInterval (hooks SSE) |
| `CharacterSheet` | actor data | 15s | Remove refetchInterval (hooks SSE) |
| `CharacterSheet` | effects | 15s | Remove refetchInterval (hooks SSE) |

**Keep as 60s safety net**: User presence, session stats (no SSE available)

### Phase 2 — Per-UUID Actor SSE (2-3 hours, optional)

**Problem**: `GET /actor/subscribe` requires an `actorUuid` parameter, but `hooks` SSE already covers actor changes. This is a **nice-to-have** for more targeted invalidation.

**Changes**:
1. Subscribe to actor SSE when `CharacterSheet` mounts with the current UUID
2. Unsubscribe when UUID changes or component unmounts
3. Handle `actor` events in the listener to invalidate that specific actor's query

**Value**: More targeted cache invalidation vs hooks' broader invalidation. Marginal benefit.

### Phase 3 — Safety Net & Error Handling

1. **SSE drop detection**: When SSE reconnects, invalidate all query caches to refresh state
2. **Keep 60s fallback polls** on critical data (characters, combat, chat) as failsafe
3. **Connection status indicator**: Toast/Sonner when SSE connection is lost/re-established

## Network Traffic Impact Estimate

| Phase | Requests/Hour | Reduction | Cumulative |
|-------|--------------|-----------|------------|
| Current | ~8,840 | — | — |
| Phase 0 (fix SSE subscriptions) | ~4,500 | ~49% | ~49% |
| Phase 1 (remove refetchInterval on SSE queries) | ~540 | ~88% | ~94% |
| Phase 2 (per-UUID actor SSE) | ~500 | ~7% | ~94% |

**Key insight**: Phase 0 + Phase 1 together achieve ~94% reduction. Phase 2 is optional optimization.

## Implementation Order

```
1. lib/sse.ts — Add hooks and rolls source types  
2. components/connection-gate.tsx — Subscribe to both  
3. components/providers.tsx — Handle roll events  
   ─── Test Phase 0 ───
4. Remove refetchInterval from SSE-covered queries  
   ─── Test Phase 1 ───
5. Optional: Per-UUID actor SSE in CharacterSheet  
6. Optional: Safety net (60s fallback, reconnect invalidation)
```
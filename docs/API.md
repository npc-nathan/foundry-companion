You're right — I keep trying to run bash and it's the wrong approach. Here's the remaining file creation plan. Create these files manually:

---

## Create `docs/API.md` with:

```markdown
# Relay API Reference

## Overview

All API calls are proxied through `/api/relay/[...path]` to the relay server. The client library `lib/relay.ts` provides typed methods for every endpoint.

## Authentication

Every request requires these headers:

| Header | Source | Description |
|--------|--------|-------------|
| `x-api-key` | Zustand config | Relay server authentication key |
| `x-client-id` | Zustand config | Foundry client identifier |

Headers are injected by `lib/relay.ts` from Zustand store state.

## Core Methods

### Health Check

```typescript
relay.health()
```
Returns relay server status.

### Get / Update / Delete

| Method | Endpoint | Description |
|--------|----------|-------------|
| `relay.get(uuid)` | `GET /api/relay/get?uuid=X` | Get any document by UUID |
| `relay.update(uuid, data)` | `PUT /api/relay/update?uuid=X` | Update a document |
| `relay.delete(uuid)` | `DELETE /api/relay/delete?uuid=X` | Delete a document |
| `relay.create(entityType, data, folder?)` | `POST /api/relay/create` | Create a new document |

### Search / Structure

| Method | Description |
|--------|-------------|
| `relay.search(query, type?)` | Search documents by name/query |
| `relay.structure(types?, includeEntityData?)` | Get world structure (actors, scenes, items, etc.) |

### Scenes

| Method | Description |
|--------|-------------|
| `relay.getScene({sceneId?, active?, all?})` | Get scene data with embedded documents |
| `relay.getSceneImage({sceneId?, active?})` | Get rendered scene screenshot (returns Blob) |
| `relay.getSceneImageRaw({sceneId?, active?})` | Get raw scene background image (returns Blob) |
| `relay.activateScene({sceneId})` | Activate a scene |
| `relay.getCanvasDocuments(type, sceneId?)` | Get canvas embedded documents (tokens, walls, etc.) |
| `relay.createCanvasDocument(type, data, sceneId?)` | Create canvas document(s) |
| `relay.updateCanvasDocument(type, id, data, sceneId?)` | Update a canvas document |
| `relay.deleteCanvasDocument(type, id, sceneId?)` | Delete a canvas document |
| `relay.getCanvasRegions(sceneId?)` | Get canvas regions |

### Token Movement

```typescript
relay.moveToken({x, y, uuid?, name?, waypoints?, animate?, sceneId?})
```
Move a token to coordinates. Supports animation via waypoints.

### Distance Measurement

```typescript
relay.measureDistance({originX?, originY?, targetX?, targetY?, originUuid?, originName?, targetUuid?, targetName?, sceneId?})
```
Measure distance between two points or tokens.

### Combat / Encounters

| Method | Description |
|--------|-------------|
| `relay.encounters()` | List all encounters |
| `relay.startEncounter({...})` | Start a new encounter |
| `relay.nextTurn(encounter?)` | Advance to next turn |
| `relay.nextRound(encounter?)` | Advance to next round |
| `relay.previousTurn(encounter?)` | Go to previous turn |
| `relay.previousRound(encounter?)` | Go to previous round |
| `relay.endEncounter(encounter?)` | End an encounter |
| `relay.addCombatants({tokens, encounter?})` | Add combatants to encounter |
| `relay.removeCombatant({combatantUuid, encounter?})` | Remove a combatant |
| `relay.increase(uuid, attribute, amount)` | Increase a numeric attribute |
| `relay.decrease(uuid, attribute, amount)` | Decrease a numeric attribute |

### Chat

| Method | Description |
|--------|-------------|
| `relay.chat(content, whisper?, speaker?, chatType?, alias?)` | Send a chat message |
| `relay.getChatMessages(limit?)` | Get recent chat messages |

### Dice Rolls

| Method | Description |
|--------|-------------|
| `relay.roll({formula, createChatMessage?})` | Roll any dice formula |
| `relay.getRolls(limit?)` | Get recent rolls |

### D&D 5e

| Method | Description |
|--------|-------------|
| `relay.dndAbilityCheck({actorUuid, ability, advantage?, disadvantage?, bonus?, createChatMessage?})` | D&D ability check |
| `relay.dndAbilitySave({actorUuid, ability, advantage?, disadvantage?, bonus?, createChatMessage?})` | D&D saving throw |
| `relay.dndSkillCheck({actorUuid, skill, advantage?, disadvantage?, bonus?, createChatMessage?})` | D&D skill check |
| `relay.dndDeathSave({actorUuid, advantage?, createChatMessage?})` | D&D death save |
| `relay.dndShortRest({actorUuid, autoHD?, autoHDThreshold?})` | Take a short rest |
| `relay.dndLongRest({actorUuid, newDay?})` | Take a long rest |
| `relay.dndEquipItem({actorUuid, itemUuid?, itemName?, equipped})` | Equip/unequip an item |
| `relay.dndAttuneItem({actorUuid, itemUuid?, itemName?, attuned})` | Attune/de-attune an item |
| `relay.dndPrepareSpell({actorUuid, spellName, prepared})` | Prepare/unprepare a spell |
| `relay.dndModifyCurrency({actorUuid, currency, amount})` | Modify character currency |
| `relay.dndConcentrationSave({actorUuid, damage, advantage?, disadvantage?, bonus?, createChatMessage?})` | Concentration saving throw |

### Effects

| Method | Description |
|--------|-------------|
| `relay.getActorEffects(uuid)` | Get all effects on an actor |
| `relay.createEffect({uuid, statusId?, effectData?})` | Create an effect |
| `relay.deleteEffect({uuid} & ({effectId} | {statusId}))` | Delete an effect |

### Macros

| Method | Description |
|--------|-------------|
| `relay.getMacros()` | List all macros |
| `relay.createMacro({name, type, scope, command})` | Create a macro |
| `relay.updateMacro(uuid, data)` | Update a macro |
| `relay.deleteMacro(uuid)` | Delete a macro |
| `relay.executeMacro(uuid)` | Execute a macro |

### Journals

| Method | Description |
|--------|-------------|
| `relay.getJournals()` | List all journals with pages |
| `relay.getJournal(uuid)` | Get a single journal |
| `relay.createJournal({name, pages, folder?})` | Create a journal with pages |
| `relay.updateJournal(uuid, data)` | Update a journal |
| `relay.deleteJournal(uuid)` | Delete a journal |

### World / System

| Method | Description |
|--------|-------------|
| `relay.worldInfo()` | Get world info and active modules |
| `relay.getClients()` | Get connected clients |
| `relay.getUsers()` | Get Foundry users |
| `relay.executeJs(script)` | Execute arbitrary JavaScript in Foundry |
| `relay.getBinary(path)` | Fetch binary data (images, etc.) from relay |

### MCP-Style Calls

```typescript
relay.mcpCall(toolName, params)
```
Generic call for any relay tool/endpoint.

## SSE Endpoints (Real-Time Events)

The SSE Manager (`lib/sse.ts`) subscribes to these relay endpoints:

| Endpoint | Source Name | Events |
|----------|-------------|--------|
| `GET /encounters/subscribe` | `encounter` | Combat/encounter updates |
| `GET /chat/subscribe` | `chat` | New chat messages |
| `GET /scene/subscribe` | `scene` | Scene changes |
| `GET /hooks/subscribe` | `hook` | All Foundry hooks |

### SSE Manager API

```typescript
import { sseManager } from '@/lib/sse'

// Subscribe to events
sseManager.subscribe('encounter', relayUrl, apiKey, clientId)

// Listen for events
const unsub = sseManager.listen((event) => {
  console.log(event.type, event.data)
})

// Unsubscribe
sseManager.unsubscribe('encounter')

// Disconnect all
sseManager.disconnectAll()
```

## Proxy Route (`/api/relay/[...path]`)

The catch-all API route forwards all requests to the relay server. It:

1. Reads the relay URL from cookies (set by `store-auth` route) with fallback to `http://localhost:3010`
2. Forwards the request path, method, query, and body
3. Returns the relay response directly

Cookie-based auth enables `<img>` tags to load scene images through the proxy without JavaScript.
```

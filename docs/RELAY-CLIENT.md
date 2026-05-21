# Relay Client (`lib/relay.ts`)

> API client for communicating with the Foundry VTT relay server.

---

## Overview

The relay client (`lib/relay.ts`) provides a typed interface for all relay API calls. It wraps `fetch()` with automatic auth header injection and routes all requests through the Next.js proxy at `/api/relay/[...path]`.

## Client Object

```ts
import { relay } from '@/lib/relay';
```

The `relay` object is a singleton that auto-reads the API key and client ID from the Zustand store on each call.

## Auth

Auth headers are injected automatically on every request:

| Header        | Source                                |
| ------------- | ------------------------------------- |
| `x-api-key`   | `useStore.getState().config.apiKey`   |
| `x-client-id` | `useStore.getState().config.clientId` |

The proxy at `/api/relay/[...path]` forwards these to the relay server.

## API Methods

### Health & Connection

| Method         | Endpoint       | Description               |
| -------------- | -------------- | ------------------------- |
| `health()`     | `GET /health`  | Check relay server health |
| `getClients()` | `GET /clients` | List connected clients    |
| `login()`      | `POST /login`  | Authenticate with relay   |

### Structure & Metadata

| Method                            | Endpoint             | Description                        |
| --------------------------------- | -------------------- | ---------------------------------- |
| `getWorldSummary()`               | `GET /world/summary` | World metadata + collection counts |
| `getWorldStructure(types, depth)` | `GET /structure`     | Folder + entity tree               |
| `getFolders()`                    | `GET /folders`       | All folders                        |

### Actors

| Method                | Endpoint              | Description           |
| --------------------- | --------------------- | --------------------- |
| `listActors()`        | `GET /actors`         | Compact actor list    |
| `searchActors(query)` | `GET /actors?search=` | Search actors by name |
| `getActor(uuid)`      | `GET /actor?uuid=`    | Full actor document   |

### Scenes

| Method                   | Endpoint               | Description         |
| ------------------------ | ---------------------- | ------------------- |
| `listScenes()`           | `GET /scenes`          | Compact scene list  |
| `getScene(sceneId)`      | `GET /scene?sceneId=`  | Full scene document |
| `activateScene(sceneId)` | `POST /scene/activate` | Switch active scene |

### Combat

| Method                       | Endpoint                     | Description         |
| ---------------------------- | ---------------------------- | ------------------- |
| `getEncounters()`            | `GET /encounters`            | Active encounters   |
| `getCombatants(encounterId)` | `GET /encounter/combatants`  | Combatant list      |
| `nextTurn(encounterId)`      | `POST /encounter/next-turn`  | Advance turn        |
| `previousTurn(encounterId)`  | `POST /encounter/prev-turn`  | Previous turn       |
| `nextRound(encounterId)`     | `POST /encounter/next-round` | Advance round       |
| `previousRound(encounterId)` | `POST /encounter/prev-round` | Previous round      |
| `startEncounter(params)`     | `POST /encounter/start`      | Start new encounter |
| `endEncounter(encounterId)`  | `POST /encounter/end`        | End encounter       |

### Chat

| Method                               | Endpoint             | Description        |
| ------------------------------------ | -------------------- | ------------------ |
| `sendChatMessage(content, whisper?)` | `POST /chat/send`    | Send chat message  |
| `getChatMessages(limit, offset)`     | `GET /chat/messages` | Recent messages    |
| `clearChat()`                        | `POST /chat/clear`   | Clear all messages |

### Dice

| Method                              | Endpoint          | Description       |
| ----------------------------------- | ----------------- | ----------------- |
| `roll(formula, createChatMessage?)` | `POST /dice/roll` | Roll dice formula |

### Journals & Macros

| Method               | Endpoint              | Description        |
| -------------------- | --------------------- | ------------------ |
| `listJournals()`     | `GET /journals`       | Journal entry list |
| `getJournal(uuid)`   | `GET /journal?uuid=`  | Full journal entry |
| `getMacros()`        | `GET /macros`         | All macros         |
| `executeMacro(uuid)` | `POST /macro/execute` | Run a macro        |

### D&D 5e Actions

| Method                        | Endpoint                        | Description             |
| ----------------------------- | ------------------------------- | ----------------------- |
| `dndAbilityCheck(params)`     | `POST /dnd/ability-check`       | Ability check           |
| `dndAbilitySave(params)`      | `POST /dnd/ability-save`        | Saving throw            |
| `dndSkillCheck(params)`       | `POST /dnd/skill-check`         | Skill check             |
| `dndDeathSave(params)`        | `POST /dnd/death-save`          | Death save              |
| `dndShortRest(params)`        | `POST /dnd/short-rest`          | Short rest              |
| `dndLongRest(params)`         | `POST /dnd/long-rest`           | Long rest               |
| `dndAttuneItem(params)`       | `POST /dnd/attune-item`         | Attune/unattune item    |
| `dndEquipItem(params)`        | `POST /dnd/equip-item`          | Equip/unequip item      |
| `dndPrepareSpell(params)`     | `POST /dnd/prepare-spell`       | Prepare/unprepare spell |
| `dndBreakConcentration(uuid)` | `POST /dnd/break-concentration` | Break concentration     |

### HP & Attributes

| Method                              | Endpoint         | Description        |
| ----------------------------------- | ---------------- | ------------------ |
| `increase(uuid, attribute, amount)` | `POST /increase` | Increase attribute |
| `decrease(uuid, attribute, amount)` | `POST /decrease` | Decrease attribute |
| `kill(uuid)`                        | `POST /kill`     | Set HP to 0        |

### Items

| Method                                      | Endpoint            | Description        |
| ------------------------------------------- | ------------------- | ------------------ |
| `listItems()`                               | `GET /items`        | Compact item list  |
| `getItem(uuid)`                             | `GET /item?uuid=`   | Full item document |
| `giveItem(fromUuid, toUuid, itemUuid, qty)` | `POST /item/give`   | Transfer item      |
| `removeItem(actorUuid, itemUuid, qty)`      | `POST /item/remove` | Remove item        |

### Effects

| Method                       | Endpoint              | Description              |
| ---------------------------- | --------------------- | ------------------------ |
| `getEffects(uuid)`           | `GET /effects`        | Active effects on entity |
| `createEffect(uuid, effect)` | `POST /effect/create` | Add active effect        |
| `deleteEffect(effectUuid)`   | `POST /effect/delete` | Remove active effect     |

### Entity CRUD

| Method                     | Endpoint              | Description       |
| -------------------------- | --------------------- | ----------------- |
| `createEntity(type, data)` | `POST /entity/create` | Create new entity |
| `updateEntity(uuid, data)` | `POST /entity/update` | Update entity     |
| `deleteEntity(uuid)`       | `POST /entity/delete` | Delete entity     |

## Image Proxy

Binary assets (scene images, character portraits) use the proxy endpoint directly:

```
/api/relay/asset?path=<path>&source=<source>
```

This bypasses the JSON response parsing and returns raw binary data. Cookies handle auth for `<img>` tags.

## Error Handling

- Network errors throw a `TypeError`
- Non-OK responses are thrown with the status code and body text
- Auth failures return 401 — check `x-api-key` and `x-client-id` in the store

## Usage Example

```ts
import { relay } from '@/lib/relay';

// Health check
const health = await relay.health();

// Get scenes
const scenes = await relay.listScenes();

// Send chat message
await relay.sendChatMessage('Hello, world!');

// D&D action
await relay.dndShortRest({ actorUuid: 'abc123' });
```

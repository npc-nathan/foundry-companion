# Chat System

> Architecture and components for the relay-backed chat system.

---

## Overview

The chat system supports three modes — In Character (IC), Out of Character (OOC), and Whisper — with party management and GIF search. It renders HTML content from the relay with sanitization.

---

## Types (`lib/chat-types.ts`)

```ts
type ChatMode = 'ic' | 'ooc' | 'whisper';

interface ChatSpeaker {
  scene?: string;
  actor?: string;
  token?: string;
  alias?: string;
}

interface ChatMessage {
  id: string;
  content: string; // HTML content from relay
  speaker?: string | ChatSpeaker;
  author?: { id: string; name: string };
  type: number | string; // 0=OOC, 1=IC, 2=Emote, 3=Whisper, 4=Roll
  whisper?: string | unknown[];
  timestamp?: string | number;
  user?: string;
  isRoll?: boolean;
  flavor?: string;
}

interface FoundryUser {
  id: string;
  name: string;
  isGM: boolean;
  active: boolean;
  color?: string;
  character?: { name?: string; id?: string };
}

interface Party {
  id: string;
  name: string;
  memberIds: string[];
  color: string;
}
```

---

## Chat Modes

### In Character (IC)

Messages sent as in-character chat. Displayed with the speaker's actor name and portrait.

### Out of Character (OOC)

Messages sent as out-of-character. Displayed with the user's name.

### Whisper

Messages sent to specific users or parties. Requires setting a DM target via the UI.

---

## Whisper Routing

Whisper routing uses two mutually exclusive store states:

- `activeUserDm: string | null` — target a single user
- `activePartyDm: Party | null` — target a party

Setting one clears the other:

```ts
setActiveUserDm: (userId) => {
  set({ activeUserDm: userId, activePartyDm: null });
},
setActivePartyDm: (party) => {
  set({ activePartyDm: party, activeUserDm: null });
},
```

When sending a whisper:

- **Single user**: relay sends whisper targeting `[userId]`
- **Party**: relay sends one whisper per party member via the API (which wraps each in `[singleId]`)

### Filter Helpers

```ts
// Check if a message is a whisper between specific users
isWhisperBetween(msg: ChatMessage, userIdA: string, userIdB: string): boolean

// Check if a message is a whisper involving any party member
isWhisperInvolvingParty(msg: ChatMessage, party: Party): boolean
```

---

## Message Display

HTML content from relay is rendered via:

1. `rewriteRelayContent()` — sanitizes and rewrites HTML for safe display
2. `dangerouslySetInnerHTML` with Tailwind prose styles

Roll messages show a `flavor` description and the roll result.

---

## Components

### Chat Layout (GM)

Two-column layout:

```
┌─────────────────────────────────────────────────────────┐
│ UserList (w-64 sidebar)    │ Message Feed + Input        │
│                            │                             │
│ - [@] User A               │ IC / OOC / Whisper tabs     │
│ - [@] User B (GM)          │ Message history             │
│ - Party: Adventurers       │ Chat input bar             │
│   ├─ User A                │ [GIF button] [Send]        │
│   └─ User C               │                             │
└─────────────────────────────────────────────────────────┘
```

Clicking a user in the sidebar sets them as a whisper target (`activeUserDm`).

### Player Chat

Simplified UserList (no whisper/party features). Messages displayed in a single feed.

### UserList

- Lists all connected users with color indicator, online status, avatar
- Click a user → set as whisper target
- Shows party groupings when parties are configured

### PartyManager

- Create/rename/delete parties
- Add/remove members
- Displays party color

### GifPicker

- Searches Tenor GIF API
- Debounced search input
- Requires `NEXT_PUBLIC_TENOR_API_KEY` in `.env.local`
- Inserts selected GIF URL into chat input

---

## Data Flow

```
User types message
         │
         ▼
Chat input component
  → Determines mode (IC/OOC/Whisper)
  → If whisper: checks activeUserDm or activePartyDm
         │
         ▼
relay.sendChatMessage(content, whisper?)
         │
         ▼
Relay server → Foundry VTT (Socket.IO)
         │
         ▼
SSE event → chat/subscribe
         │
         ▼
React Query cache invalidated → Message list refreshes
```

## Chat Upload

Images can be uploaded via `/api/chat-upload/route.ts` which proxies the file to the relay server and returns a URL for embedding in chat messages.

## Related Store State

| Field           | Type             | Description                  |
| --------------- | ---------------- | ---------------------------- |
| `activeUserDm`  | `string \| null` | Current user whisper target  |
| `activePartyDm` | `Party \| null`  | Current party whisper target |
| `mutedUsers`    | `string[]`       | Muted user IDs               |
| `parties`       | `Party[]`        | Known party groups           |

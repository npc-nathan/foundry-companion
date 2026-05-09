# Companion App v2 — Feature Implementation Plan

> **Goal:** Transform the companion app from a read-heavy tool into a full Foundry companion — letting GMs and players run entire sessions without opening the Foundry browser tab.

**Architecture:** Single Next.js app, client-side pages under `/gm/` and `/player/`, Zustand store for state, TanStack Query for API calls, relay client (`lib/relay.ts`) for all Foundry API calls via the relay proxy.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Zustand, TanStack Query, Tailwind CSS v4, shadcn/ui, lucide-react, sonner (toasts).

---

## Phase 1: Relay Client — Add Missing Methods

Extend `lib/relay.ts` with methods for all existing relay API endpoints not yet wired.

### Task P1.1: Add rest/save relay methods

**Files:** `lib/relay.ts`

Add to the `RelayClient` class:

```typescript
async dndShortRest(params: { actorUuid: string; autoHD?: boolean; autoHDThreshold?: number }) {
  return this.post('/dnd5e/short-rest', params)
}

async dndLongRest(params: { actorUuid: string; newDay?: boolean }) {
  return this.post('/dnd5e/long-rest', params)
}

async dndEquipItem(params: { actorUuid: string; itemName: string; equipped: boolean }) {
  return this.post('/dnd5e/equip-item', params)
}

async dndModifyCurrency(params: { actorUuid: string; currency: string; amount: number }) {
  return this.post('/dnd5e/modify-currency', params)
}

async dndPrepareSpell(params: { actorUuid: string; spellName: string; prepared: boolean }) {
  return this.post('/dnd5e/prepare-spell', params)
}

async dndAttuneItem(params: { actorUuid: string; itemName: string; attuned: boolean }) {
  return this.post('/dnd5e/attune-item', params)
}

async createEffect(params: { uuid: string; name: string; changes: string; statusId?: string }) {
  return this.post('/effect', params)
}

async deleteEffect(params: { effectUuid: string }) {
  return this.delete(`/effect/${params.effectUuid}`)
}

async getActorEffects(params: { uuid: string }) {
  return this.get(`/actor/${params.uuid}/effects`)
}

async getClientele() {
  return this.get('/clients')
}

async dndDeathSave(params: { actorUuid: string; createChatMessage: boolean }) {
  return this.post('/dnd5e/death-save', params)
}

async dndConcentrationSave(params: { actorUuid: string; damage: number }) {
  return this.post('/dnd5e/concentration-save', params)
}

async getEncounters() {
  return this.get('/encounters')
}

async deleteCombatant(params: { combatantUuid: string }) {
  return this.post('/encounter/remove-combatant', params)
}
```

### Task P1.2: Add canvas region methods

**Files:** `lib/relay.ts`

```typescript
async getCanvasRegions(params?: { sceneId?: string }) {
  const query = params?.sceneId ? `?sceneId=${params.sceneId}` : ''
  return this.get(`/canvas/regions${query}`)
}
```

---

## Phase 2: Character Sheet — Player Upgrades

The player character sheet (`app/player/character/page.tsx`) needs the most love. Currently it has abilities, skills, items, spells, features — but no rest actions, no equip toggle, no death save, no effects.

### Task PC.1: Add Short Rest / Long Rest buttons

**Files:** `app/player/character/page.tsx`

Add two prominent buttons at the top of the character card:
- **Short Rest** — calls `relay.dndShortRest({ actorUuid })` with optional auto-HD toggle
- **Long Rest** — calls `relay.dndLongRest({ actorUuid })` with optional new-day toggle

Each button triggers a mutation, shows a confirmation toast with result, and invalidates character queries to refresh HP/slots/resources.

### Task PC.2: Add equip/unequip toggle on inventory items

**Files:** `app/player/character/page.tsx`

In the inventory section, each item row shows an "Equipped" or "Carried" badge. Add a toggle button that calls `relay.dndEquipItem({ actorUuid, itemName, equipped: !currentlyEquipped })`.

### Task PC.3: Add death save button (visible when HP ≤ 0)

**Files:** `app/player/character/page.tsx`

When `actor.hp.value === 0`, show a large red DEATH SAVE button that calls `relay.dndDeathSave({ actorUuid, createChatMessage: true })`. Replace the Damage/Heal action with this during death saves.

### Task PC.4: Add active effects display

**Files:** `app/player/character/page.tsx`

After spells section, add an "Active Effects" panel. Fetch via `relay.getActorEffects({ uuid })`. Show each effect's name, icon, and remaining duration if available.

### Task PC.5: Add spell preparation toggle (for prepared casters)

**Files:** `app/player/character/page.tsx`

Each spell in the spell section that has a `preparation.mode` of "prepared" shows a toggle. Clicking calls `relay.dndPrepareSpell({ actorUuid, spellName, prepared: !currentlyPrepared })`.

### Task PC.6: Add attunement toggle on items

**Files:** `app/player/character/page.tsx`

Items requiring attunement (`attunement !== null`) show a toggle. Clicking calls `relay.dndAttuneItem({ actorUuid, itemName, attuned: !currentlyAttuned })`.

### Task PC.7: Add HP bar with damage/heal inline controls

**Files:** `app/player/character/page.tsx`

Replace simple HP display with a shadcn progress bar showing current/max. Add +1, +5 hit buttons (damage) and -1, -5 heal buttons, calling `relay.decreaseAttribute(...)` and `relay.increaseAttribute(...)` on `attributes.hp.value`.

---

## Phase 3: GM Actor Detail — Full Character Sheet

Currently bare bones (HP + abilities only). Needs to mirror player character sheet richness.

### Task GA.1: Fetch full actor data on detail page

**Files:** `app/gm/actors/[id]/page.tsx`

The GM detail page currently only fetches `getActorDetails` for HP/spells. Switch to full `getActor` for the complete actor document, plus `getActorEffects` for active effects.

### Task GA.2: Full ability scores + saves display

**Files:** `app/gm/actors/[id]/page.tsx`

Add ability scores (STR/DEX/CON/INT/WIS/CHA with mods), saving throw display with proficiency indicator, all skills display with mods.

### Task GA.3: HP bar with damage/heal controls for GMs

**Files:** `app/gm/actors/[id]/page.tsx`

Big HP section at top — progress bar, inline damage/heal inputs (±N with preset buttons for 1, 5, 10, all). Kill button.

### Task GA.4: Items/Inventory management

**Files:** `app/gm/actors/[id]/page.tsx`

Full inventory list with equip toggle, attunement toggle, item detail. Quick-add items from a search dropdown.

### Task GA.5: Spells section

**Files:** `app/gm/actors/[id]/page.tsx`

Spell list by level with slots display, spell preparation toggle.

### Task GA.6: Active effects management

**Files:** `app/gm/actors/[id]/page.tsx`

Show active effects, allow adding common status effects (poisoned, blinded, stunned, charmed, prone, etc.) via a dropdown, and removing them.

### Task GA.7: Short/Long Rest for GM actors

**Files:** `app/gm/actors/[id]/page.tsx`

Same rest buttons as player sheet.

---

## Phase 4: Combat Tracker — GM Upgrades

### Task CT.1: Previous turn/round buttons

**Files:** `app/gm/combat/page.tsx`

Add "Previous Turn" and "Previous Round" buttons alongside the existing Next buttons. Relay has `previousTurn`/`previousRound` methods already — just wire them.

### Task CT.2: Inline damage/heal on combatant rows

**Files:** `app/gm/combat/page.tsx`

Each combatant card currently shows HP bar read-only. Add ±5, ±10, ±1 buttons on each row that call `relay.decreaseAttribute` / `relay.increaseAttribute` on `attributes.hp.value` for that combatant's actor UUID.

### Task CT.3: Conditions/effects per combatant

**Files:** `app/gm/combat/page.tsx`

Show condition icons (poisoned, blinded, etc.) on each combatant row based on active effects. Quick-add common conditions from a dropdown.

### Task CT.4: Add combatants to encounter

**Files:** `app/gm/combat/page.tsx`

A control to add NPCs from the actor list as combatants. Dropdown search → select → add (`mcp_foundry_add_combatant` equivalent).

### Task CT.5: Remove combatant from encounter

**Files:** `app/gm/combat/page.tsx`

A small X button per combatant to remove them from the encounter.

---

## Phase 5: Player Dashboard Upgrades

### Task PD.1: Own character HP/widget on dashboard

**Files:** `app/player/page.tsx`

Add the player's own character card inline: HP bar, AC, level/class, XP progress. Click → character sheet.

### Task PD.2: Active effects glance

**Files:** `app/player/page.tsx`

Show any status conditions on the player's character (buffs, debuffs, conditions) as small badges.

### Task PD.3: Active scene thumbnail

**Files:** `app/player/page.tsx`

Currently shows the active scene as a card — add a small image thumbnail via the screenshot endpoint.

---

## Phase 6: GM Dashboard Upgrades

### Task GD.1: Party overview widget

**Files:** `app/gm/page.tsx`

A card showing all PC-type actors at a glance — HP bars, AC, level, status effects. Like a mini party tracker. Update on interval.

### Task GD.2: Quick encounter controls on dashboard

**Files:** `app/gm/page.tsx`

Show active encounter summary + quick links to next turn, roll for NPCs, etc.

---

## Phase 7: Chat — Cross-app Improvements

### Task CH.1: Extract shared chat components

**Files:** `app/gm/chat/page.tsx`, `app/player/chat/page.tsx`

The GM and player chat pages share ~70% of their code (message rendering, scroll-to-bottom, chat type badges). Extract a shared `components/chat-message.tsx` component.

### Task CH.2: Add emote mode to player chat

**Files:** `app/player/chat/page.tsx`

Player chat currently only sends OOC messages. Add IC and Emote mode toggles matching the GM chat.

### Task CH.3: Auto-scroll lock

**Files:** shared chat component

Add a "lock scroll" behavior — auto-scrolls when at bottom, shows a "New messages" bar when scrolled up and new messages arrive.

---

## Phase 8: Infrastructure — SSE & Performance

### Task SS.1: Wire SSE into the app

**Files:** `lib/sse.ts`, store, layouts

The SSE module already exists and connects. Wire it into the app: on successful connection, subscribe to encounter, chat, and scene channels. When events arrive, invalidate relevant TanStack Query keys. This replaces polling where possible.

### Task SS.2: Reduce polling intervals

**Files:** All pages using `refetchInterval`

After SSE is wired, reduce chat polling from 3s to 10s (SSE handles real-time). Combat polling from 5s to 15s. Keep actors/scenes at 30s+ since SSE can update them.

---

## Implementation Order

| Priority | Phase | Effort | Impact |
|----------|-------|--------|--------|
| 1 | P1 (relay methods) | Small | Enables everything else |
| 2 | PC.1 (rest buttons) | Small | Player-facing, huge quality-of-life |
| 3 | PC.2 (equip toggle) | Small | Player-facing, immediate utility |
| 4 | CT.1 (prev turn) | Tiny | GM combat accuracy |
| 5 | CT.2 (combat damage) | Medium | Big GM time saver |
| 6 | PC.7 (HP bar inline) | Small | Player UI polish |
| 7 | PC.3 (death save) | Small | Critical combat feature |
| 8 | PC.4 (effects display) | Medium | Player visibility |
| 9 | PC.5 (spell prep) | Medium | Essential for casters |
| 10 | PC.6 (attunement) | Small | Item management |
| 11 | GA.1-7 (GM actor full) | Large | Brings GM to parity |
| 12 | CT.3-5 (combat conditions) | Medium | Combat depth |
| 13 | PD.1-3 (player dash) | Medium | Home page value |
| 14 | GD.1-2 (GM dash) | Medium | GM overseeing |
| 15 | CH.1-3 (chat polish) | Medium | UX consistency |
| 16 | SS.1-2 (SSE) | Large | Foundation work |

**Total phases: 8, Total tasks: ~25**

---

## Risks & Tradeoffs

- **SSE (Phase 8)** is the biggest unknown — the SSE module exists but needs to be proven stable with the relay. Can be deferred to the end.
- **GM Actor detail (Phase 3)** is the largest single file change. Consider splitting into sub-components.
- All mutations go through the relay proxy — error handling is consistent but every failed call shows a toast.

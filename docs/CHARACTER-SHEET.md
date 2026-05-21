# Character Sheet

> D&D 5e character sheet — component directory, tabs, hooks, mutations, and data flow.

---

## Directory Structure

```
components/character-sheet/
├── index.ts                  # Re-exports CharacterSheet
├── types.ts                  # TypeScript type definitions
├── use-actor-data.ts         # Data extraction hook (~397 lines)
├── use-actor-mutations.ts    # Mutation hooks (~135 lines)
├── ui-helpers.tsx            # Shared UI utilities
├── ui/
│   └── collapsible-section.tsx   # Collapsible section wrapper
├── item-detail-sheet.tsx     # Item detail panel (slide-in sheet)
├── system-item-viewer.tsx    # System item metadata display
└── tabs/
    ├── types.ts              # Tab prop types
    ├── attributes-tab.tsx    # STR/DEX/CON/INT/WIS/CHA + skills
    ├── combat-tab.tsx        # HP, AC, initiative, speed, proficiencies
    ├── effects-tab.tsx       # Active effects management
    ├── features-tab.tsx      # Class features, racial traits, feats
    ├── inventory-tab.tsx     # Equipment, currency, item management
    └── spells-tab.tsx        # Spell slots, prepared spells, casting
```

## Main Component

**`components/CharacterSheet.tsx`** — ~1,773 lines (the largest component in the app).

### Responsibilities

- Receives actor UUID and raw data from React Query
- Delegates to `useActorData` for typed data extraction
- Renders tab navigation (Attributes, Combat, Inventory, Spells, Features, Effects)
- Passes mutations from `useActorMutations` to each tab
- Manages detail item state for the item-detail sheet

### Tab Bar

| Tab        | Component            | Focus                                                   |
| ---------- | -------------------- | ------------------------------------------------------- |
| Attributes | `attributes-tab.tsx` | Ability scores, skill checks, saves                     |
| Combat     | `combat-tab.tsx`     | HP bar, AC, initiative, damage/heal, rests, death saves |
| Inventory  | `inventory-tab.tsx`  | Equipment list, weight, currency, equip/unequip         |
| Spells     | `spells-tab.tsx`     | Spell slots, prepared spells, casting ability           |
| Features   | `features-tab.tsx`   | Class features, racial traits, feats, proficiencies     |
| Effects    | `effects-tab.tsx`    | Active conditions, duration, removal                    |

---

## Data Flow

```
Actor UUID (from URL or selection)
         │
         ▼
React Query: useQuery(['actor', uuid])
  → GET /actor?uuid=<uuid>
  → Returns raw actor document
         │
         ▼
useActorData(actorData, effectsData)
  → Extracts typed fields from raw data
  → Returns ActorData object
         │
         ▼
CharacterSheet.tsx
  → Renders tabs
  → Passes ActorData + mutations to each tab
         │
         ▼
Tab components
  → Read-only display in player mode
  → Interactive controls in GM mode
  → Call mutations to update server state
```

---

## Hooks

### `useActorData(actorData, effectsData)`

Pure extraction hook. Takes raw API response data and returns typed `ActorData`.

Extracts these categories:

| Category     | Fields                                                     |
| ------------ | ---------------------------------------------------------- |
| Identity     | name, img, race, class, level, background, alignment, size |
| HP           | value, max, temp, percentage                               |
| Combat Stats | proficiency bonus, AC, initiative bonus, speed, XP         |
| Abilities    | str/dex/con/int/wis/cha — each with value, mod, proficient |
| Saves        | Each save with mod + proficient                            |
| Skills       | All skills with mod, proficient, and associated ability    |
| Resources    | Custom resource bars                                       |
| Items        | Equipment array with type, weight, equipped status         |
| Spells       | Spell slots, spell list, prepared spells                   |
| Movement     | Walk, fly, swim, climb, burrow speeds                      |
| Effects      | Active effects array                                       |
| Currency     | pp, gp, ep, sp, cp                                         |
| Traits       | Size, senses, languages, damage resistances                |
| Details      | Background, ideals, bonds, flaws, personality traits       |

### `useActorMutations(uuid)`

Returns mutation objects for all D&D 5e actions:

| Mutation               | Type          | Description                   |
| ---------------------- | ------------- | ----------------------------- |
| `damageMutation`       | `useMutation` | Apply damage to HP            |
| `healMutation`         | `useMutation` | Heal HP                       |
| `shortRestMutation`    | `useMutation` | Short rest (spend hit dice)   |
| `longRestMutation`     | `useMutation` | Long rest (restore HP, slots) |
| `deathSaveMutation`    | `useMutation` | Roll death save               |
| `equipMutation`        | `useMutation` | Equip/unequip item            |
| `attuneMutation`       | `useMutation` | Attune/unattune magic item    |
| `prepareSpellMutation` | `useMutation` | Prepare/unprepare spell       |
| `abilityCheckMutation` | `useMutation` | Roll ability check            |
| `skillCheckMutation`   | `useMutation` | Roll skill check              |
| `doRoll`               | `function`    | Roll arbitrary formula        |

Each mutation:

- Calls the corresponding relay API method
- Invalidates `['actor', uuid]` query on success
- Shows a toast notification on success/error

---

## Tab Interfaces

### `SheetTabProps`

```ts
interface SheetTabProps {
  data: ActorData;
  readOnly?: boolean;                // true for player view
  mutations: { ... };                // all mutation objects
  rolling: string | null;            // currently rolling ability/skill
  setRolling: (v: string | null) => void;
  setDetailItem: (item: FoundryItem | null) => void;
  uuid: string;
}
```

### `TabMutation`

```ts
interface TabMutation {
  isPending: boolean;
  mutate: (...args: any[]) => void;
}
```

---

## Item Detail

`item-detail-sheet.tsx` provides a slide-in sheet (`<Sheet>`) showing:

- Item name, type, weight
- Description text
- Properties (damage, AC bonus, charges, attunement)
- Actions (equip/unequip, attune/unattune)

`system-item-viewer.tsx` displays system-specific item metadata (D&D 5e weapon/armor properties).

---

## Player vs GM Mode

- **Player view**: read-only data, ability to roll checks/saves, rests
- **GM view**: full read/write — edit everything, manage inventory, apply damage/heal
- Controlled by the `readOnly` prop passed down from the page route

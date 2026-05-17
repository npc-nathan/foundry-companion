# Macro System — Developer Guide

## Overview

The macro system provides two interfaces for creating and managing Foundry macros:

1. **Code Editor** — Traditional text-based editor using CodeMirror 6
2. **Node Builder** — Visual graph-based editor using React Flow

Both interfaces share the same CRUD backend through the relay API.

---

## Code Editor (app/gm/macros/page.tsx – Code Tab)

### Features

- **CodeMirror 6** with:
  - JavaScript/TypeScript syntax highlighting
  - Line numbers
  - Bracket matching
  - Dark theme
  - Dynamic import (SSR disabled)
- **Metadata form**: Name, Type (script/macro), Scope (global/actor)
- **Operations**: Create, Save, Delete, Execute
- **Search/filter**: Filter macros by name

### Usage

```
1. Select a macro from the left panel (or click "New")
2. Edit the code in the CodeMirror editor
3. Update name/type/scope as needed
4. Click "Save" to persist changes
5. Click "Run" to execute the macro via the relay
6. Click "Delete" to remove the macro
```

### Component Architecture

```
app/gm/macros/page.tsx
├── Tab bar (Code / Nodes)
├── Code Editor Tab:
│   ├── Left panel: Search bar + macro list
│   └── Right panel:
│       ├── Name, Type, Scope fields
│       ├── CodeMirror 6 editor (dynamic import)
│       └── Action buttons (Run, Save, Delete, New)
│
└── Node Builder Tab:
    └── React Flow canvas (see below)
```

---

## Node Builder (components/macros/node-editor.tsx)

### Features

- **React Flow canvas** with:
  - Draggable node palette (left sidebar)
  - Connection edges between nodes
  - Custom edge type (data-edge.tsx)
  - Properties panel for selected nodes
  - "Export Code" button → generates Foundry-compatible JavaScript
- **Expression Editor** for building conditions

### Palette Nodes

| Node Type          | Description                                      |
| ------------------ | ------------------------------------------------ |
| **Roll Dice**      | Roll a dice formula, output the result           |
| **Send Chat**      | Send a message to the chat                       |
| **Apply Effect**   | Apply a status effect to a token/actor           |
| **Condition**      | Branching logic (if/else) with Expression Editor |
| **Variable**       | Store and manipulate variables                   |
| **Run Macro**      | Execute another macro by name/UUID               |
| **Search Actors**  | Find actors by query string                      |
| **Search Targets** | Find targeted tokens                             |
| **Search Scenes**  | Find scenes by query                             |
| **Get HP**         | Get or set HP value on an actor                  |
| **Roll Table**     | Roll on a Rollable Table                         |

### Module Integration Nodes

The node editor includes templates for 15+ popular Foundry modules:

| Module                        | Node Types                      |
| ----------------------------- | ------------------------------- |
| **DFreds Convenient Effects** | Apply/remove convenient effects |
| **DAE**                       | Dynamic Active Effects setup    |
| **Sequencer**                 | Play sequences and animations   |
| **FXMaster**                  | Apply/remove visual filters     |
| **Item Macro**                | Execute item-linked macros      |
| **Smart Target**              | Target management               |
| **Monk's Active Tiles**       | Trigger tile interactions       |
| **Dice So Nice**              | Configure 3D dice appearance    |
| **Wall Height**               | Manage wall elevation           |
| **Levels**                    | Multi-level scene features      |
| **Automated Animations**      | Trigger automated animations    |
| **Active Auras**              | Manage aura effects             |
| **Monk's Wall Enhancement**   | Enhanced wall controls          |
| **Dice Calculator**           | Dice calculation utilities      |

These are defined in `lib/module-mappings.ts`.

---

## Expression Editor (components/macros/expression-editor.tsx)

The Expression Editor allows building conditions for the **Condition** node.

### Modes

1. **Simple Mode**: Row-based condition builder

   - Select a field from upstream node outputs
   - Choose an operator (===, !==, >, <, >=, <=, contains, startsWith, etc.)
   - Enter a value
   - Add/remove rows (AND/OR logic)

2. **Advanced Mode**: Full JavaScript expression editor
   - Write raw JS expressions
   - Access upstream data via variable references
   - Uses CodeMirror 6 with JS highlighting

### Data Field Selection

When clicking the field selector, the editor shows available outputs from:

- Connected upstream nodes (based on edges)
- Each output's type (string, number, boolean, actor, token, scene, etc.)

This is powered by `lib/node-schemas.ts` which declares output schemas for each node type.

### Architecture

```
ExpressionEditor
├── Mode toggle: Simple / Advanced
├── Simple Mode:
│   ├── Rows: [Field selector] [Operator selector] [Value input]
│   ├── Logic connector: AND / OR
│   └── Add Row button
├── Advanced Mode:
│   └── CodeMirror 6 textarea (JS mode)
├── Content Functions (left tab):
│   └── Pre-built functions for common operations
├── Expression Field Picker (right tab):
│   └── Tree of available data fields from upstream nodes
└── Insert button
```

---

## Code Export (Node → JavaScript)

The "Export Code" button in the Node Builder traverses the React Flow graph and generates Foundry-compatible JavaScript. The export process:

1. **Topological sort** of the graph nodes
2. **Code generation** per node type:
   - Roll Dice → `new Roll(formula).evaluate({async: true})`
   - Send Chat → `ChatMessage.create({content})`
   - Apply Effect → `actor.effects.set()` or `game.dfreds.effects()`
   - Condition → `if (expression) { ... }`
   - Variable → `const varName = value`
   - Search → `game.actors.getName()` or `game.actors.search()`
3. **Edge connections** become variable references or chained calls
4. **Output**: Rendered in a read-only CodeMirror view for review/copy

---

## Relay API

All macro operations go through the relay proxy:

| Method                  | Endpoint                                          | Description     |
| ----------------------- | ------------------------------------------------- | --------------- |
| `GET /macros`           | `relay.getMacros()`                               | List all macros |
| `POST /macros`          | `relay.createMacro({name, type, scope, command})` | Create a macro  |
| `PATCH /macros?uuid=X`  | `relay.updateMacro(uuid, {data})`                 | Update a macro  |
| `DELETE /macros?uuid=X` | `relay.deleteMacro(uuid)`                         | Delete a macro  |
| `POST /macros/evaluate` | `relay.executeMacro(uuid)`                        | Execute a macro |

---

## Node Schemas (lib/node-schemas.ts)

Each node type declares its output schema for use by the Expression Editor:

```typescript
// Example schema structure
type NodeSchema = {
  outputs: Record<string, FieldDefinition>;
};

type FieldDefinition = {
  type: 'string' | 'number' | 'boolean' | 'actor' | 'token' | 'scene' | 'any';
  label: string;
  description?: string;
};
```

Schemas enable:

- Type-safe field selection in the Expression Editor
- Validation of connected node outputs
- Auto-completion when building conditions

---

## Module Mappings (lib/module-mappings.ts)

The module mappings define code generation templates for third-party Foundry modules. Each mapping includes:

```typescript
type ModuleMapping = {
  moduleId: string; // Foundry module ID
  moduleName: string; // Display name
  nodes: Array<{
    type: string; // Node type identifier
    label: string; // Display label
    config: NodeConfig; // Configuration schema
    generateCode: (config: NodeConfig) => string; // Code generator
  }>;
};
```

---

## Data Flow

```
User interaction
    │
    ▼
React Flow canvas (node-editor.tsx)
    │ Node drag, connect, configure
    ▼
Canvas state (React, nodes + edges)
    │
    ├──┐ "Export Code" button
    │  ▼
    │  Code Generator (traverses graph → JS string)
    │  │
    │  ▼
    │  Preview pane (read-only CodeMirror)
    │
    └──┐ "Save as Macro" button
       ▼
       relay.createMacro({command: generatedCode})
       │
       ▼
       Relay → Foundry VTT
```

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Macro Creator & Editor Architecture

## Files
- `app/gm/macros/page.tsx` — Main macro page. Two-tab layout: Code Editor + Node Builder.
  - Code Editor tab: left panel lists/search macros, right panel has CodeMirror 6 editor with JS syntax highlighting, name/type/scope metadata form, Run/Save/Delete/Create buttons.
  - Node Builder tab: React Flow canvas with draggable palette (Roll Dice, Send Chat, Apply Effect, Condition, Variable, Run Macro nodes).
- `components/macros/code-editor.tsx` — CodeMirror 6 wrapper. Dynamic import (SSR: false). Supports line numbers, bracket matching, JS/TS highlighting, dark theme.
- `components/macros/node-editor.tsx` — React Flow node canvas. Left sidebar palette, drag-and-drop nodes, connection edges, properties panel, "Export Code" button generates Foundry-compatible JS from graph.

## Relay API Endpoints
- `GET /macros` — list all macros
- `POST /macros` — create macro (body: {name, type, scope, command})
- `PATCH /macros?uuid=X` — update macro (body: {data})
- `DELETE /macros?uuid=X` — delete macro
- `POST /macros/evaluate` — execute macro (body: {uuid})

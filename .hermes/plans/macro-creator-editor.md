# Macro Creator & Editor Implementation Plan

> **For Hermes:** Implement task-by-task. Each task is bite-sized (2-5 min). Build, verify, commit after each.

**Goal:** A full macro creator/editor for GMs that combines a code IDE (Monaco-like editor with syntax highlighting, run/debug) with a visual n8n-style node-based flow builder for composing macro logic.

**Architecture:** Two-tab interface inside a new `/gm/macros` route:
- **Tab 1: List & Code Editor** — Browse/search all Foundry macros. Click to open in a code editor (CodeMirror 6 for light weight) with syntax highlighting, run, save, create, delete.
- **Tab 2: Node Builder** — Visual flow canvas using React Flow (n8n-style). Nodes represent macro steps (roll dice, send chat, apply effect, condition check). Compose node graph → export as macro script.

**Tech Stack:**
- CodeMirror 6 (`@codemirror/view`, `@codemirror/state`, `@codemirror/lang-javascript`, `@codemirror/theme-one-dark`, `@codemirror/basic-setup`) — React-compatible code editor (not React itself)
- React Flow (`@xyflow/react`) — React library for node-based canvas (not React itself)
- TanStack Query for data fetching / mutations
- shadcn components for UI consistency (cards, buttons, dialogs)
- Relay API: `GET /macros`, `POST /create` (Macro type), `PUT /update` (Macro uuid), `DELETE /delete` (Macro uuid)

**Files to Create:**
- `app/gm/macros/page.tsx` — Main macro page with tabs
- `app/gm/macros/macro-code-editor.tsx` — Code editor component
- `app/gm/macros/macro-node-editor.tsx` — Node-based builder
- `app/gm/macros/macro-list.tsx` — Macro list/search panel
- `app/gm/macros/macro-nodes.ts` — Node type definitions for React Flow

**Files to Modify:**
- `components/sidebar.tsx` — Add "Macros" nav item
- `lib/relay.ts` — Add `getMacros()`, `createMacro()`, `updateMacro()`, `deleteMacro()` relay methods

---

### Task 1: Add relay methods for macro CRUD

**Objective:** Add relay API client methods for listing, creating, updating, and deleting macros.

**Files:**
- Modify: `lib/relay.ts`

**Step 1: Read current relay.ts to find insertion point**

Read `lib/relay.ts` and find the last method or appropriate location near other entity methods.

**Step 2: Add macro methods**

Add these methods to the `relay` object:

```typescript
/** Get all macros from the Foundry world */
async getMacros(): Promise<any> {
  return this.apiGet('/macros')
},

/** Create a new macro */
async createMacro(data: {
  name: string,
  type: 'script' | 'chat',
  command: string,
  scope?: 'global' | 'actors' | 'player',
  img?: string,
}): Promise<any> {
  return this.apiPost('/create', {
    entityType: 'Macro',
    data,
  })
},

/** Update an existing macro */
async updateMacro(uuid: string, data: Partial<{
  name: string,
  command: string,
  type: 'script' | 'chat',
  scope: string,
  img: string,
}>): Promise<any> {
  return this.apiPost('/update', {
    uuid,
    data,
  })
},

/** Delete a macro */
async deleteMacro(uuid: string): Promise<any> {
  return this.apiPost('/delete', { uuid })
},

/** Execute a macro by UUID */
async executeMacro(uuid: string): Promise<any> {
  return this.apiPost('/macros/execute', { uuid })
},
```

**Step 3: Build & verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

```bash
git add lib/relay.ts
git commit -m "feat: add macro CRUD relay methods"
```

---

### Task 2: Install CodeMirror 6 and React Flow npm packages

**Objective:** Add the npm packages for the code editor and node-based canvas. These are React-compatible libraries — React itself is already provided by Next.js.

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Install CodeMirror 6 packages**

```bash
npm install @codemirror/view @codemirror/state @codemirror/lang-javascript @codemirror/theme-one-dark @codemirror/commands @codemirror/basic-setup
```

**Step 2: Install React Flow**

```bash
npm install @xyflow/react
```

**Step 3: Build & verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add CodeMirror 6 and React Flow dependencies"
```

---

### Task 3: Add Macro nav item to sidebar

**Objective:** Add "Macros" link to the GM sidebar navigation.

**Files:**
- Modify: `components/sidebar.tsx`

**Step 1: Read current sidebar.tsx**

Verify the current gmNavItems array.

**Step 2: Add Macro icon import and nav item**

Add `Code2` to the lucide-react imports. Add to `gmNavItems`:

```typescript
import { ..., Code2 } from "lucide-react"

const gmNavItems = [
  { label: "Dashboard", href: "/gm", icon: LayoutDashboard },
  { label: "Scenes", href: "/gm/scenes", icon: Map },
  { label: "Actors", href: "/gm/actors", icon: Users },
  { label: "Combat", href: "/gm/combat", icon: Swords },
  { label: "Chat", href: "/gm/chat", icon: MessageSquare },
  { label: "Dice", href: "/gm/dice", icon: Dice5 },
  { label: "Macros", href: "/gm/macros", icon: Code2 },  // ← Add this
]
```

**Step 3: Build & verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

```bash
git add components/sidebar.tsx
git commit -m "feat: add Macros nav item to GM sidebar"
```

---

### Task 4: Create main Macro page with tabs

**Objective:** Create the `/gm/macros/page.tsx` route with a tab switcher between Code Editor and Node Builder views.

**Files:**
- Create: `app/gm/macros/page.tsx`
- Create: `app/gm/macros/macro-list.tsx`
- Create: `app/gm/macros/macro-code-editor.tsx`
- Create: `app/gm/macros/macro-node-editor.tsx`
- Create: `app/gm/macros/macro-nodes.ts`

**Step 1: Create `app/gm/macros/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { MacroList } from './macro-list'
import { MacroCodeEditor } from './macro-code-editor'
import { MacroNodeEditor } from './macro-node-editor'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Tab = 'list' | 'node-builder'

interface Macro {
  uuid: string
  id: string
  name: string
  type: 'script' | 'chat'
  command: string
  scope: string
  author: string
  img?: string
}

export default function GMMacrosPage() {
  const [activeTab, setActiveTab] = useState<Tab>('list')
  const [selectedMacro, setSelectedMacro] = useState<Macro | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSelect = (macro: Macro) => {
    setSelectedMacro(macro)
    setActiveTab('list')
  }

  const handleNewMacro = () => {
    setSelectedMacro(null)
    setActiveTab('list')
  }

  const handleSaved = () => {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Macros</h1>
          <p className="text-sm text-muted-foreground">
            Create, edit, and run Foundry VTT macros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('list')}
          >
            Code Editor
          </Button>
          <Button
            variant={activeTab === 'node-builder' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('node-builder')}
          >
            Node Builder
          </Button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <MacroList
              onSelect={handleSelect}
              onNew={handleNewMacro}
              refreshKey={refreshKey}
            />
          </div>
          <div className="lg:col-span-2">
            <MacroCodeEditor
              macro={selectedMacro}
              onSaved={handleSaved}
            />
          </div>
        </div>
      ) : (
        <MacroNodeEditor onSaved={handleSaved} />
      )}
    </div>
  )
}
```

**Step 2: Create `app/gm/macros/macro-list.tsx`**

```tsx
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { relay } from '@/lib/relay'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Trash2, Play, FileCode } from 'lucide-react'

interface Macro {
  uuid: string
  id: string
  name: string
  type: 'script' | 'chat'
  command: string
  scope: string
  author: string
  img?: string
}

interface MacroListProps {
  onSelect: (macro: Macro) => void
  onNew: () => void
  refreshKey: number
}

export function MacroList({ onSelect, onNew, refreshKey }: MacroListProps) {
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['macros', refreshKey],
    queryFn: () => relay.getMacros(),
  })

  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => relay.deleteMacro(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['macros'] })
      toast.success('Macro deleted')
    },
    onError: (err: any) => toast.error(`Delete failed: ${String(err)}`),
  })

  const executeMutation = useMutation({
    mutationFn: (uuid: string) => relay.executeMacro(uuid),
    onSuccess: () => toast.success('Macro executed'),
    onError: (err: any) => toast.error(`Execute failed: ${String(err)}`),
  })

  // Extract macros from relay response
  const macros: Macro[] = (() => {
    const raw = data as any
    if (raw?.data && Array.isArray(raw.data)) return raw.data
    if (Array.isArray(raw)) return raw
    if (raw?.macros && Array.isArray(raw.macros)) return raw.macros
    return []
  })()

  const filtered = macros.filter((m) =>
    m.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">All Macros</CardTitle>
          <Button size="sm" variant="outline" onClick={onNew}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search macros..."
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {isLoading && (
            <div className="p-4 text-sm text-muted-foreground">Loading macros...</div>
          )}
          {filtered.length === 0 && !isLoading && (
            <div className="p-4 text-sm text-muted-foreground">No macros found.</div>
          )}
          {filtered.map((macro) => (
            <div
              key={macro.uuid}
              className="flex items-center gap-2 px-4 py-2.5 hover:bg-accent/50 cursor-pointer border-b last:border-0 group"
              onClick={() => onSelect(macro)}
            >
              <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{macro.name}</p>
                <p className="text-xs text-muted-foreground truncate font-mono">
                  {macro.command?.slice(0, 60)}
                  {macro.command?.length > 60 ? '…' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    executeMutation.mutate(macro.uuid)
                  }}
                  title="Run macro"
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete "${macro.name}"?`)) {
                      deleteMutation.mutate(macro.uuid)
                    }
                  }}
                  title="Delete macro"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
```

Note: This uses a `ScrollArea` component from shadcn. If it doesn't exist, replace with a plain `div` with `overflow-y-auto`.

**Step 3: Create `app/gm/macros/macro-code-editor.tsx`**

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { relay } from '@/lib/relay'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Play, Save, FileCode } from 'lucide-react'
import { EditorView, basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

interface Macro {
  uuid: string
  name: string
  type: 'script' | 'chat'
  command: string
  scope: string
}

interface MacroCodeEditorProps {
  macro: Macro | null
  onSaved: () => void
}

export function MacroCodeEditor({ macro, onSaved }: MacroCodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<'script' | 'chat'>('script')
  const [scope, setScope] = useState('global')
  const queryClient = useQueryClient()

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current) return

    if (!viewRef.current) {
      viewRef.current = new EditorView({
        doc: macro?.command || '// Write your macro here\n',
        extensions: [
          basicSetup,
          javascript({ typescript: true }),
          oneDark,
          EditorView.theme({
            '&': { height: '400px' },
            '.cm-scroller': { overflow: 'auto' },
          }),
        ],
        parent: editorRef.current,
      })
    }

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [])  // Mount once

  // Update editor content when macro changes
  useEffect(() => {
    if (viewRef.current && macro) {
      const view = viewRef.current
      const currentText = view.state.doc.toString()
      if (currentText !== macro.command) {
        view.dispatch({
          changes: {
            from: 0,
            to: currentText.length,
            insert: macro.command || '',
          },
        })
      }
      setName(macro.name)
      setType(macro.type || 'script')
      setScope(macro.scope || 'global')
    } else if (viewRef.current && !macro) {
      const view = viewRef.current
      const currentText = view.state.doc.toString()
      view.dispatch({
        changes: {
          from: 0,
          to: currentText.length,
          insert: '// Write your macro here\n',
        },
      })
      setName('')
      setType('script')
      setScope('global')
    }
  }, [macro?.uuid])  // eslint-disable-line react-hooks/exhaustive-deps

  const getCode = useCallback(() => {
    return viewRef.current?.state.doc.toString() || ''
  }, [])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const command = getCode()
      if (!name.trim()) throw new Error('Macro name is required')

      if (macro?.uuid) {
        return relay.updateMacro(macro.uuid, {
          name: name.trim(),
          command,
          type,
          scope,
        })
      } else {
        return relay.createMacro({
          name: name.trim(),
          type,
          command,
          scope,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['macros'] })
      toast.success(macro ? 'Macro updated' : 'Macro created')
      onSaved()
    },
    onError: (err: any) => toast.error(`Save failed: ${String(err)}`),
  })

  const executeMutation = useMutation({
    mutationFn: () => {
      if (!macro?.uuid) throw new Error('Save the macro before executing')
      return relay.executeMacro(macro.uuid)
    },
    onSuccess: () => toast.success('Macro executed'),
    onError: (err: any) => toast.error(`Execute failed: ${String(err)}`),
  })

  const isNew = !macro

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCode className="h-4 w-4" />
            {isNew ? 'New Macro' : `Edit: ${macro.name}`}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isNew && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => executeMutation.mutate()}
                disabled={executeMutation.isPending}
              >
                <Play className="h-4 w-4 mr-1" />
                Run
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              {isNew ? 'Create' : 'Save'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="macro-name" className="text-xs">Name</Label>
            <Input
              id="macro-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Macro"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="macro-type" className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'script' | 'chat')}>
              <SelectTrigger id="macro-type" className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="script">Script</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="macro-scope" className="text-xs">Scope</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger id="macro-scope" className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="actors">Actors</SelectItem>
                <SelectItem value="player">Player</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div
          ref={editorRef}
          className="border rounded-md overflow-hidden"
          style={{ minHeight: '400px' }}
        />
      </CardContent>
    </Card>
  )
}
```

**Step 4: Create `app/gm/macros/macro-nodes.ts`**

```typescript
import type { Node, Edge, NodeTypes } from '@xyflow/react'

// === Node Type Definitions ===

export type MacroNodeType =
  | 'rollDice'
  | 'sendChat'
  | 'applyEffect'
  | 'condition'
  | 'variable'
  | 'runMacro'

// === Node Data Interfaces ===

export interface RollDiceData {
  formula: string
  label: string
}

export interface SendChatData {
  content: string
  mode: 'ooc' | 'ic' | 'emote'
}

export interface ApplyEffectData {
  effectName: string
  target: string
}

export interface ConditionData {
  expression: string
  label: string
}

export interface VariableData {
  name: string
  value: string
}

export interface RunMacroData {
  macroName: string
  macroId: string
}

// === Initial Node Factory ===

const nodeCounter = { current: 0 }

export function createNode(type: MacroNodeType, position?: { x: number; y: number }): Node {
  const id = `${type}-${++nodeCounter.current}`
  const pos = position || {
    x: 100 + Math.random() * 300,
    y: 50 + Math.random() * 200,
  }

  const base = { id, position: pos, type }

  switch (type) {
    case 'rollDice':
      return { ...base, data: { formula: '1d20', label: 'Roll' } satisfies RollDiceData }
    case 'sendChat':
      return { ...base, data: { content: 'Hello!', mode: 'ooc' } satisfies SendChatData }
    case 'applyEffect':
      return { ...base, data: { effectName: '', target: '' } satisfies ApplyEffectData }
    case 'condition':
      return { ...base, data: { expression: '', label: 'If' } satisfies ConditionData }
    case 'variable':
      return { ...base, data: { name: 'myVar', value: '' } satisfies VariableData }
    case 'runMacro':
      return { ...base, data: { macroName: '', macroId: '' } satisfies RunMacroData }
  }
}

// === Default Nodes for New Canvas ===

export const defaultNodes: Node[] = [
  {
    id: 'start-1',
    type: 'start',
    position: { x: 250, y: 25 },
    data: { label: 'Start' },
  },
]

export const defaultEdges: Edge[] = []

// === Generate Code from Node Graph ===

export function nodesToCode(nodes: Node[], edges: Edge[]): string {
  // Sort nodes by topological order (follow edges from start)
  const edgeMap = new Map<string, string[]>()
  for (const edge of edges) {
    const targets = edgeMap.get(edge.source) || []
    targets.push(edge.target)
    edgeMap.set(edge.source, targets)
  }

  const ordered: Node[] = []
  const visited = new Set<string>()

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    const node = nodes.find((n) => n.id === nodeId)
    if (node) ordered.push(node)
    for (const target of edgeMap.get(nodeId) || []) {
      visit(target)
    }
  }

  // Find start node(s) — nodes with no incoming edges
  const hasIncoming = new Set<string>()
  for (const edge of edges) hasIncoming.add(edge.target)
  const roots = nodes.filter((n) => !hasIncoming.has(n.id))

  for (const root of roots) visit(root.id)

  // Generate code
  const lines: string[] = []
  lines.push('// Generated by Macro Node Builder')
  lines.push('')

  for (const node of ordered) {
    const d = node.data as any
    switch (node.type) {
      case 'rollDice': {
        const formula = d.formula || '1d20'
        const label = d.label || 'Roll'
        lines.push(`// ${label}`)
        lines.push(`const roll = await new Roll("${formula}").evaluate({async: true})`)
        lines.push(`roll.toMessage({flavor: "${label}"})`)
        lines.push('')
        break
      }
      case 'sendChat': {
        const content = (d.content || '').replace(/"/g, '\\"')
        const mode = d.mode || 'ooc'
        if (mode === 'emote') {
          lines.push(`// Emote`)
          lines.push(`ChatMessage.create({content: "${content}", type: CONST.CHAT_MESSAGE_TYPES.EMOTE})`)
        } else {
          lines.push(`// ${mode.toUpperCase()} Message`)
          lines.push(`ChatMessage.create({content: "${content}"})`)
        }
        lines.push('')
        break
      }
      case 'applyEffect': {
        const effectName = (d.effectName || '').replace(/"/g, '\\"')
        const target = d.target || 'token'
        lines.push(`// Apply Effect: ${effectName}`)
        lines.push(`if (canvas.tokens.controlled.length > 0) {`)
        lines.push(`  const target = canvas.tokens.controlled[0].actor`)
        lines.push(`  if (target) {`)
        lines.push(`    await target.createEmbeddedDocuments("ActiveEffect", [{`)
        lines.push(`      name: "${effectName}",`)
        lines.push(`      changes: [],`)
        lines.push(`      duration: { rounds: 1 }`)
        lines.push(`    }])`)
        lines.push(`  }`)
        lines.push(`}`)
        lines.push('')
        break
      }
      case 'condition': {
        const expr = d.expression || 'true'
        const label = d.label || 'If'
        lines.push(`// ${label}: ${expr}`)
        lines.push(`if (${expr}) {`)
        lines.push(`  // TODO: connect condition body`)
        lines.push(`}`)
        lines.push('')
        break
      }
      case 'variable': {
        const varName = d.name || 'myVar'
        const varValue = d.value || ''
        lines.push(`// Variable: ${varName}`)
        lines.push(`const ${varName} = ${varValue}`)
        lines.push('')
        break
      }
      case 'runMacro': {
        const macroName = d.macroName || d.macroId || 'unknown'
        lines.push(`// Run Macro: ${macroName}`)
        lines.push(`game.macros.getName("${macroName}")?.execute()`)
        lines.push('')
        break
      }
    }
  }

  return lines.join('\n')
}
```

**Step 5: Create `app/gm/macros/macro-node-editor.tsx`**

```tsx
'use client'

import { useCallback, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { relay } from '@/lib/relay'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Play, Save, Code } from 'lucide-react'
import {
  createNode,
  defaultNodes,
  defaultEdges,
  nodesToCode,
  type MacroNodeType,
} from './macro-nodes'
import { MacroCodeEditor } from './macro-code-editor'

// === Custom Node Components ===

const nodeStyles = {
  rollDice: { bg: 'bg-blue-500/10 border-blue-500/30', label: '🎲 Roll Dice' },
  sendChat: { bg: 'bg-green-500/10 border-green-500/30', label: '💬 Send Chat' },
  applyEffect: { bg: 'bg-purple-500/10 border-purple-500/30', label: '✨ Apply Effect' },
  condition: { bg: 'bg-yellow-500/10 border-yellow-500/30', label: '🔀 Condition' },
  variable: { bg: 'bg-cyan-500/10 border-cyan-500/30', label: '📦 Variable' },
  runMacro: { bg: 'bg-orange-500/10 border-orange-500/30', label: '▶️ Run Macro' },
} as const

function MacroFlowNode({ data, type }: NodeProps & { type?: string }) {
  const style = nodeStyles[type as keyof typeof nodeStyles] || nodeStyles.rollDice
  return (
    <div className={`rounded-lg border ${style.bg} p-3 min-w-[180px] shadow-sm`}>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      <div className="text-xs font-semibold mb-1">{style.label}</div>
      {Object.entries(data as Record<string, unknown>).map(([key, val]) => {
        if (key === 'label') return null
        const v = String(val ?? '')
        return (
          <div key={key} className="text-xs text-muted-foreground truncate">
            {key}: {v || '(empty)'}
          </div>
        )
      })}
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  )
}

function StartNode() {
  return (
    <div className="rounded-lg border bg-emerald-500/10 border-emerald-500/30 p-3 min-w-[120px] shadow-sm text-center">
      <div className="text-xs font-semibold">▶ Start</div>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  )
}

const nodeTypes = {
  rollDice: (props: NodeProps) => <MacroFlowNode {...props} type="rollDice" />,
  sendChat: (props: NodeProps) => <MacroFlowNode {...props} type="sendChat" />,
  applyEffect: (props: NodeProps) => <MacroFlowNode {...props} type="applyEffect" />,
  condition: (props: NodeProps) => <MacroFlowNode {...props} type="condition" />,
  variable: (props: NodeProps) => <MacroFlowNode {...props} type="variable" />,
  runMacro: (props: NodeProps) => <MacroFlowNode {...props} type="runMacro" />,
  start: StartNode,
}

// === Main Component ===

interface MacroNodeEditorProps {
  onSaved: () => void
}

export function MacroNodeEditor({ onSaved }: MacroNodeEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges)
  const [showCode, setShowCode] = useState(false)
  const queryClient = useQueryClient()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow') as MacroNodeType
      if (!type) return

      const position = reactFlowWrapper.current
        ? { x: event.clientX - 100, y: event.clientY - 50 }
        : undefined

      const newNode = createNode(type, position)
      setNodes((nds) => nds.concat(newNode))
    },
    [setNodes]
  )

  const generateCode = useCallback(() => {
    return nodesToCode(nodes, edges)
  }, [nodes, edges])

  const generatedMacro = useCallback(() => {
    const code = generateCode()
    return {
      name: 'Node Builder Output',
      command: code,
    }
  }, [generateCode])

  if (showCode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCode(false)}>
            ← Back to Canvas
          </Button>
        </div>
        <MacroCodeEditor
          macro={generatedMacro() as any}
          onSaved={onSaved}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Node Palette */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Node Palette — Drag onto canvas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(nodeStyles).map(([type, style]) => (
              <div
                key={type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/reactflow', type)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                className={`${style.bg} rounded-md border px-3 py-1.5 text-xs cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity`}
              >
                {style.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Flow Canvas */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground">
          {nodes.length} nodes · {edges.length} connections
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCode(true)}
          >
            <Code className="h-4 w-4 mr-1" />
            Export Code
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setNodes(defaultNodes)
              setEdges(defaultEdges)
              toast.success('Canvas cleared')
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      <div
        ref={reactFlowWrapper}
        className="h-[500px] border rounded-md"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  )
}
```

**Step 6: Create shadcn ScrollArea component if it doesn't exist**

Check if `components/ui/scroll-area.tsx` exists. If not, create the basic ScrollArea:

```tsx
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function ScrollArea({ children, className, ...props }: ScrollAreaProps) {
  return (
    <div className={cn('overflow-y-auto', className)} {...props}>
      {children}
    </div>
  )
}
```

Or if shadcn is configured, run: `npx shadcn@latest add scroll-area`

**Step 7: Build & verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 8: Commit**

```bash
git add app/gm/macros/ components/ui/scroll-area.tsx
git commit -m "feat: add macro code editor, node builder, and all sub-components"
```

---

### Task 5: Test the macro page loads and renders

**Objective:** Verify the new route renders without errors in the development server.

**Step 1: Start dev server (if not running)**

```bash
cd ~/foundry-companion && npm run dev
```

**Step 2: Open browser to the macro page**

Navigate to `http://localhost:3000/gm/macros` (requires a logged-in GM session or bypass connection gate).

**Step 3: Verify tabs work**

- Code Editor tab renders: macro list on left, code editor on right
- Node Builder tab renders: node palette, flow canvas, export button

**Step 4: Fix any issues**

If there are TypeScript/import errors, fix them and rebuild.

---

### Task 6: Update AGENTS.md with macro architecture

**Objective:** Document the macro feature in the project's AGENTS.md.

**Files:**
- Modify: `AGENTS.md`

**Step 1: Read current AGENTS.md**

**Step 2: Append macro architecture section**

Add at the end:

```markdown
## Macro Creator & Editor

### Architecture
- Page: `/gm/macros` — split into Code Editor tab and Node Builder tab
- Code Editor: CodeMirror 6 with JavaScript syntax highlighting, macro metadata form
- Node Builder: @xyflow/react canvas with draggable node palette
- Code generation: `nodesToCode()` converts node graph to Foundry VTT JavaScript

### Relay API
- `GET /macros` — list all macros
- `POST /create` with `{entityType: 'Macro', data: {...}}` — create
- `PUT /update` with `{uuid, data: {...}}` — update
- `DELETE /delete` with `{uuid}` — delete
- `POST /macros/execute` with `{uuid}` — execute
```

**Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document macro creator/editor architecture"
```

---

### Future Enhancements (Post-MVP)

- **Node property editing** — Click a node to edit its properties in a side panel
- **Macro import/export** — JSON export/import of node graphs
- **Node library** — Save node sub-graphs as reusable templates
- **Syntax validation** — Real-time JS linting in code editor
- **Drag-to-reorder** in macro list
- **Multi-file tabs** in code editor

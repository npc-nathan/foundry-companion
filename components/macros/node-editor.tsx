'use client'

import { useState, useCallback } from 'react'
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Code, Trash2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────

type NodeCategory = 'action' | 'logic' | 'data'

interface CustomNodeData {
  type: string
  label: string
  category: NodeCategory
  description: string
  formula?: string
  flavor?: string
  content?: string
  mode?: string
  effectName?: string
  target?: string
  condition?: string
  trueLabel?: string
  falseLabel?: string
  name?: string
  value?: string
  macroName?: string
  [key: string]: unknown
}

type MacroNode = Node<CustomNodeData>
type MacroEdge = Edge

interface PaletteItem {
  type: string
  label: string
  category: NodeCategory
  description: string
  defaultData: Partial<CustomNodeData>
}

const paletteItems: PaletteItem[] = [
  { type: 'rollDice', label: 'Roll Dice', category: 'action', description: 'Roll a dice formula', defaultData: { formula: '1d20', flavor: '' } },
  { type: 'sendChat', label: 'Send Chat', category: 'action', description: 'Send a message to chat', defaultData: { content: 'Hello!', mode: 'OOC' } },
  { type: 'applyEffect', label: 'Apply Effect', category: 'action', description: 'Apply an active effect', defaultData: { effectName: '', target: '' } },
  { type: 'condition', label: 'Condition', category: 'logic', description: 'If/else branching', defaultData: { condition: 'true', trueLabel: 'True', falseLabel: 'False' } },
  { type: 'variable', label: 'Variable', category: 'data', description: 'Set or get a variable', defaultData: { name: 'myVar', value: '' } },
  { type: 'runMacro', label: 'Run Macro', category: 'action', description: 'Execute another macro', defaultData: { macroName: '' } },
]

// ─── Node Component ─────────────────────────────────────────

function MacroNodeComponent({ data, selected }: { data: CustomNodeData; selected: boolean }) {
  return (
    <Card className={cn(
      'min-w-[160px] px-3 py-2 shadow-md border-l-4',
      data.category === 'action' ? 'border-l-blue-500' :
      data.category === 'logic' ? 'border-l-amber-500' :
      'border-l-green-500',
      selected && 'ring-2 ring-primary'
    )}>
      <div className="flex items-center gap-2">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div>
          <div className="text-xs font-semibold">{data.label}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {data.description || data.type}
          </div>
        </div>
      </div>
    </Card>
  )
}

const nodeTypes = {
  macroNode: MacroNodeComponent,
}

// ─── Props ──────────────────────────────────────────────────

interface Props {
  currentCode: string
  onCodeGenerated: (code: string) => void
  macroName: string
  macroType: string
  macroScope: string
}

// ─── Canvas Component ───────────────────────────────────────

function FlowCanvas({ onCodeGenerated, macroName }: { onCodeGenerated: (code: string) => void; macroName: string }) {
  const reactFlowInstance = useReactFlow<Node<CustomNodeData>>()
  const [nodes, setNodes, onNodesChange] = useNodesState<MacroNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<MacroEdge>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  )

  const addNodeToCanvas = useCallback((item: PaletteItem) => {
    const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const pos = reactFlowInstance.screenToFlowPosition({
      x: window.innerWidth / 2 + Math.random() * 200 - 100,
      y: window.innerHeight / 2 + Math.random() * 200 - 100,
    }) || { x: 250, y: 150 }

    const newNode: MacroNode = {
      id,
      type: 'macroNode',
      position: pos,
      data: {
        type: item.type,
        label: item.label,
        category: item.category,
        description: item.description,
        ...item.defaultData,
      },
    }
    setNodes((nds) => [...nds, newNode])
  }, [reactFlowInstance, setNodes])

  const deleteSelected = useCallback(() => {
    if (!selectedNode) return
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode))
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode && e.target !== selectedNode))
    setSelectedNode(null)
  }, [selectedNode, setNodes, setEdges])

  const updateNodeData = useCallback((nodeId: string, field: string, value: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, [field]: value } }
          : n
      )
    )
  }, [setNodes])

  // ─── Export to Code ─────────────────────────────────────
  const exportCode = useCallback(() => {
    const edgeMap = new Map<string, string[]>()
    const inDegree = new Map<string, number>()
    nodes.forEach((n) => {
      edgeMap.set(n.id, [])
      inDegree.set(n.id, 0)
    })
    edges.forEach((e) => {
      edgeMap.get(e.source)?.push(e.target)
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
    })

    const queue: string[] = []
    const sorted: string[] = []
    inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id) })
    while (queue.length > 0) {
      const id = queue.shift()!
      sorted.push(id)
      edgeMap.get(id)?.forEach((target) => {
        const newDeg = (inDegree.get(target) || 1) - 1
        inDegree.set(target, newDeg)
        if (newDeg === 0) queue.push(target)
      })
    }

    const lines: string[] = []
    lines.push(`// Generated from node graph: ${macroName || 'Untitled Macro'}`)
    lines.push('')

    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    for (const id of sorted) {
      const node = nodeMap.get(id)
      if (!node) continue

      const d = node.data

      switch (d.type) {
        case 'rollDice': {
          const formula = d.formula || '1d20'
          lines.push(`// Roll Dice: ${formula}`)
          lines.push(`const roll = await game.dice.roll("${formula}")`)
          lines.push('await roll.evaluate({ async: true })')
          if (d.flavor) lines.push(`roll.toMessage({ flavor: "${d.flavor.replace(/"/g, '\\"')}" })`)
          lines.push('const rollResult = roll.total')
          lines.push('')
          break
        }
        case 'sendChat': {
          const content = String(d.content || '')
          const mode = d.mode === 'IC' ? 'IC' : 'OOC'
          lines.push('// Send Chat Message')
          lines.push('ChatMessage.create({')
          lines.push(`  content: "${content.replace(/"/g, '\\"')}",`)
          lines.push(`  type: CONST.CHAT_MESSAGE_TYPES.${mode},`)
          lines.push('})')
          lines.push('')
          break
        }
        case 'applyEffect': {
          const effectName = String(d.effectName || '')
          lines.push('// Apply Effect')
          lines.push('if (token) {')
          lines.push('  const effect = await ActiveEffect.create({')
          lines.push(`    label: "${effectName.replace(/"/g, '\\"')}",`)
          lines.push('    origin: token.actor.uuid,')
          lines.push('    duration: { seconds: 60 }')
          lines.push('  })')
          lines.push('  await token.actor.createEmbeddedDocuments("ActiveEffect", [effect])')
          lines.push('}')
          lines.push('')
          break
        }
        case 'condition': {
          const cond = String(d.condition || 'true')
          const trueLabel = String(d.trueLabel || 'True')
          lines.push(`// Condition: ${cond}`)
          lines.push(`if (${cond}) {`)
          lines.push(`  // ${trueLabel} path`)
          lines.push('  // Connected nodes execute here')
          lines.push('}')
          lines.push('')
          break
        }
        case 'variable': {
          const varName = String(d.name || 'myVar')
          const varValue = String(d.value || 'undefined')
          lines.push(`// Variable: ${varName}`)
          lines.push(`const ${varName} = ${varValue}`)
          lines.push('')
          break
        }
        case 'runMacro': {
          const macroName = String(d.macroName || '')
          lines.push(`// Run Macro: ${macroName}`)
          lines.push(`game.macros.getName("${macroName.replace(/"/g, '\\"')}")?.execute()`)
          lines.push('')
          break
        }
      }
    }

    lines.push('// End of macro')
    onCodeGenerated(lines.join('\n'))
    toast.success('Code generated from node graph')
  }, [nodes, edges, macroName, onCodeGenerated])

  const selectedNodeData = selectedNode
    ? nodes.find((n) => n.id === selectedNode)?.data ?? null
    : null

  return (
    <div className="flex h-full">
      {/* Palette sidebar */}
      <div className="w-56 shrink-0 border-r bg-muted/10 flex flex-col overflow-y-auto p-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Actions</div>
        {paletteItems.filter((i) => i.category === 'action').map((item) => (
          <button
            key={item.type}
            onClick={() => addNodeToCanvas(item)}
            className="text-left px-2 py-1.5 rounded text-sm hover:bg-accent/50 transition-colors mb-1"
          >
            <span className="font-medium">{item.label}</span>
            <p className="text-[10px] text-muted-foreground">{item.description}</p>
          </button>
        ))}
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-4">Logic</div>
        {paletteItems.filter((i) => i.category === 'logic').map((item) => (
          <button
            key={item.type}
            onClick={() => addNodeToCanvas(item)}
            className="text-left px-2 py-1.5 rounded text-sm hover:bg-accent/50 transition-colors mb-1"
          >
            <span className="font-medium">{item.label}</span>
            <p className="text-[10px] text-muted-foreground">{item.description}</p>
          </button>
        ))}
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-4">Data</div>
        {paletteItems.filter((i) => i.category === 'data').map((item) => (
          <button
            key={item.type}
            onClick={() => addNodeToCanvas(item)}
            className="text-left px-2 py-1.5 rounded text-sm hover:bg-accent/50 transition-colors mb-1"
          >
            <span className="font-medium">{item.label}</span>
            <p className="text-[10px] text-muted-foreground">{item.description}</p>
          </button>
        ))}

        <div className="mt-auto pt-3 border-t space-y-2">
          <Button size="sm" className="w-full gap-1" onClick={exportCode} disabled={nodes.length === 0}>
            <Code className="h-3.5 w-3.5" />
            Export Code
          </Button>
          <Button size="sm" variant="destructive" className="w-full gap-1" onClick={deleteSelected} disabled={!selectedNode}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete Node
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow<Node<CustomNodeData>, Edge>
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange as OnNodesChange<MacroNode>}
          onEdgesChange={onEdgesChange as OnEdgesChange<MacroEdge>}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedNode(node.id)}
          onPaneClick={() => setSelectedNode(null)}
          fitView
          deleteKeyCode="Delete"
          className="bg-muted/5"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls className="bg-card" />
          <MiniMap className="bg-card" nodeStrokeColor="#888" nodeColor="#333" />
        </ReactFlow>

        {/* Selected node properties panel */}
        {selectedNode && selectedNodeData && (
          <div className="absolute bottom-4 left-4 right-4 bg-card border rounded-lg shadow-lg p-4 max-w-md z-10">
            <div className="text-sm font-semibold mb-3">{selectedNodeData.label} Properties</div>
            <div className="space-y-2">
              {Object.entries(selectedNodeData)
                .filter(([key]) => !['type', 'label', 'category', 'description'].includes(key))
                .map(([key, val]) => (
                  <div key={key}>
                    <Label className="text-xs capitalize">{key}</Label>
                    <Input
                      className="h-8 text-xs mt-0.5"
                      value={String(val ?? '')}
                      onChange={(e) => updateNodeData(selectedNode, key, e.target.value)}
                      placeholder={`Enter ${key}...`}
                    />
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Root Provider Wrapper ─────────────────────────────────

export default function NodeEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  )
}

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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
import { Code, Trash2, GripVertical, Loader2, ChevronDown, ChevronRight, Blocks } from 'lucide-react'
import { cn } from '@/lib/utils'
import { relay } from '@/lib/relay'

// ─── Types ──────────────────────────────────────────────────

type NodeCategory = 'action' | 'logic' | 'data' | 'macro'

interface CustomNodeData {
  type: string
  label: string
  category: NodeCategory
  description: string
  // roll dice
  formula?: string
  flavor?: string
  // send chat
  content?: string
  mode?: string
  // apply effect
  effectName?: string
  // condition
  condition?: string
  trueLabel?: string
  falseLabel?: string
  // variable
  name?: string
  value?: string
  // run macro
  macroName?: string
  macroUuid?: string
  // deal damage / heal
  target?: string
  amount?: string
  // ability / skill check
  ability?: string
  skill?: string
  // toggle scene
  sceneName?: string
  sceneId?: string
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

interface RemoteMacro {
  uuid: string
  id: string
  name: string
  type: string
  command: string
  scope: string
  img?: string
}

// ─── Static palette items ───────────────────────────────────

const staticPaletteItems: PaletteItem[] = [
  // Actions
  { type: 'rollDice', label: 'Roll Dice', category: 'action', description: 'Roll a dice formula', defaultData: { formula: '1d20', flavor: '' } },
  { type: 'dealDamage', label: 'Deal Damage', category: 'action', description: 'Deal damage to selected token', defaultData: { target: 'selected', amount: '10' } },
  { type: 'healTarget', label: 'Heal Target', category: 'action', description: 'Heal selected token', defaultData: { target: 'selected', amount: '10' } },
  { type: 'sendChat', label: 'Send Chat', category: 'action', description: 'Send a message to chat', defaultData: { content: 'Hello!', mode: 'OOC' } },
  { type: 'applyEffect', label: 'Apply Effect', category: 'action', description: 'Apply an active effect', defaultData: { effectName: 'Burning', target: 'selected', amount: '60' } },
  { type: 'abilityCheck', label: 'Ability Check', category: 'action', description: 'Roll an ability check', defaultData: { ability: 'str', flavor: '' } },
  { type: 'skillCheck', label: 'Skill Check', category: 'action', description: 'Roll a skill check', defaultData: { skill: 'prc', flavor: '' } },
  // Logic
  { type: 'condition', label: 'Condition', category: 'logic', description: 'If/else branching', defaultData: { condition: 'true', trueLabel: 'True', falseLabel: 'False' } },
  // Data
  { type: 'variable', label: 'Variable', category: 'data', description: 'Set or get a variable', defaultData: { name: 'myVar', value: '' } },
]

interface PaletteSection {
  title: string
  icon?: React.ReactNode
  items: PaletteItem[]
}

// ─── Node Component ─────────────────────────────────────────

const categoryColors: Record<NodeCategory, string> = {
  action: 'border-l-blue-500',
  logic: 'border-l-amber-500',
  data: 'border-l-green-500',
  macro: 'border-l-purple-500',
}

function MacroNodeComponent({ data, selected }: { data: CustomNodeData; selected: boolean }) {
  return (
    <Card className={cn(
      'min-w-[160px] px-3 py-2 shadow-md border-l-4',
      categoryColors[data.category] || 'border-l-blue-500',
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
  const [remoteMacros, setRemoteMacros] = useState<RemoteMacro[]>([])
  const [loadingMacros, setLoadingMacros] = useState(true)
  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({})

  // ─── Fetch macros from relay ────────────────────────────
  useEffect(() => {
    let mounted = true
    setLoadingMacros(true)
    relay.getMacros()
      .then((data) => {
        if (!mounted) return
        const raw: unknown[] = data && 'macros' in (data as object)
          ? ((data as Record<string, unknown>).macros as unknown[])
          : data && 'data' in (data as object)
            ? ((data as Record<string, unknown>).data as unknown[])
            : Array.isArray(data) ? data : []
        const macros: RemoteMacro[] = raw.map((m) => {
          const r = m as Record<string, unknown>
          return {
            uuid: (r.uuid as string) || (r._id as string) || '',
            id: (r.id as string) || '',
            name: (r.name as string) || '',
            type: (r.type as string) || 'script',
            command: (r.command as string) || '',
            scope: (r.scope as string) || 'global',
            img: r.img as string | undefined,
          }
        }).filter((m) => m.uuid)
        setRemoteMacros(macros)
        setLoadingMacros(false)
      })
      .catch(() => {
        if (mounted) {
          setRemoteMacros([])
          setLoadingMacros(false)
        }
      })
    return () => { mounted = false }
  }, [])

  // ─── Build palette sections ─────────────────────────────
  const paletteSections: PaletteSection[] = [
    {
      title: 'Actions',
      items: staticPaletteItems.filter((i) => i.category === 'action'),
    },
    {
      title: 'Logic',
      items: staticPaletteItems.filter((i) => i.category === 'logic'),
    },
    {
      title: 'Data',
      items: staticPaletteItems.filter((i) => i.category === 'data'),
    },
  ]

  if (remoteMacros.length > 0) {
    paletteSections.push({
      title: `Foundry Macros (${remoteMacros.length})`,
      icon: <Blocks className="h-3 w-3 text-purple-500" />,
      items: remoteMacros.map((m) => ({
        type: 'runMacro',
        label: m.name,
        category: 'macro' as NodeCategory,
        description: `Run "${m.name}"`,
        defaultData: {
          macroName: m.name,
          macroUuid: m.uuid,
          description: `Execute: ${m.name}`,
        },
      })),
    })
  }

  const toggleSection = (title: string) => {
    setSectionsCollapsed((prev) => ({ ...prev, [title]: !prev[title] }))
  }

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

  // ─── Sanitize helpers ───────────────────────────────────
  const esc = (s: string) => s.replace(/"/g, '\\"')
  const escBlock = (s: string) => s.replace(/`/g, '\\`').replace(/\$/g, '\\$')

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
    lines.push('// Requires a selected token on the canvas')
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
          lines.push(`const roll = await game.dice.roll("${esc(formula)}")`)
          lines.push('await roll.evaluate({ async: true })')
          if (d.flavor) lines.push(`roll.toMessage({ flavor: "${esc(d.flavor)}" })`)
          lines.push('const rollResult = roll.total')
          lines.push('')
          break
        }
        case 'dealDamage': {
          const amount = d.amount || '10'
          lines.push('// Deal Damage')
          lines.push('if (token) {')
          lines.push(`  const cur = token.actor.system.attributes.hp.value`)
          lines.push(`  const newHp = Math.max(0, cur - ${parseInt(amount) || 10})`)
          lines.push('  await token.actor.update({ "system.attributes.hp.value": newHp })')
          lines.push(`  ChatMessage.create({ content: \`\${token.name} takes ${esc(amount)} damage.\` })`)
          lines.push('}')
          lines.push('')
          break
        }
        case 'healTarget': {
          const amount = d.amount || '10'
          lines.push('// Heal Target')
          lines.push('if (token) {')
          lines.push(`  const cur = token.actor.system.attributes.hp.value`)
          lines.push(`  const max = token.actor.system.attributes.hp.max`)
          lines.push(`  const newHp = Math.min(max, cur + ${parseInt(amount) || 10})`)
          lines.push('  await token.actor.update({ "system.attributes.hp.value": newHp })')
          lines.push(`  ChatMessage.create({ content: \`\${token.name} heals for ${esc(amount)}.\` })`)
          lines.push('}')
          lines.push('')
          break
        }
        case 'sendChat': {
          const content = String(d.content || '')
          const mode = d.mode === 'IC' ? 'IC' : 'OOC'
          lines.push('// Send Chat Message')
          lines.push('ChatMessage.create({')
          lines.push(`  content: "${esc(content)}",`)
          lines.push(`  type: CONST.CHAT_MESSAGE_TYPES.${mode},`)
          lines.push('})')
          lines.push('')
          break
        }
        case 'applyEffect': {
          const effectName = String(d.effectName || '')
          const dur = d.amount || '60'
          lines.push('// Apply Effect')
          lines.push('if (token) {')
          lines.push('  const effectData = {')
          lines.push(`    label: "${esc(effectName)}",`)
          lines.push('    origin: token.actor.uuid,')
          lines.push(`    duration: { seconds: ${parseInt(dur) || 60} }`)
          lines.push('  }')
          lines.push('  await token.actor.createEmbeddedDocuments("ActiveEffect", [effectData])')
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
          const macroName = d.macroName || ''
          const macroUuid = d.macroUuid || ''
          lines.push(`// Run Macro: ${macroName}`)
          if (macroUuid) {
            lines.push(`game.macros.get("${esc(macroUuid)}")?.execute()`)
          } else if (macroName) {
            lines.push(`game.macros.getName("${esc(macroName)}")?.execute()`)
          }
          lines.push('')
          break
        }
        case 'abilityCheck': {
          const ability = d.ability || 'str'
          const flavors = d.flavor ? `, { flavor: "${esc(d.flavor)}" }` : ''
          lines.push(`// Ability Check: ${ability.toUpperCase()}`)
          lines.push('if (token) {')
          lines.push(`  await token.actor.rollAbilityTest("${esc(ability)}"${flavors})`)
          lines.push('}')
          lines.push('')
          break
        }
        case 'skillCheck': {
          const skill = d.skill || 'prc'
          const flavors = d.flavor ? `, { flavor: "${esc(d.flavor)}" }` : ''
          lines.push(`// Skill Check: ${skill}`)
          lines.push('if (token) {')
          lines.push(`  await token.actor.rollSkill("${esc(skill)}"${flavors})`)
          lines.push('}')
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

  // ─── Field labels for properties panel ───────────────────
  const fieldLabels: Record<string, string> = {
    formula: 'Formula',
    flavor: 'Flavor Text',
    content: 'Message',
    mode: 'Mode',
    effectName: 'Effect Name',
    target: 'Target',
    amount: 'Duration (seconds)',
    condition: 'Condition',
    trueLabel: 'True Label',
    falseLabel: 'False Label',
    name: 'Variable Name',
    value: 'Value',
    macroName: 'Macro Name',
    macroUuid: 'Macro UUID',
    ability: 'Ability',
    skill: 'Skill',
  }

  const fieldPlaceholders: Record<string, string> = {
    formula: 'e.g. 1d20+5',
    flavor: 'Optional flavor text',
    content: 'Your message here',
    mode: 'OOC or IC',
    effectName: 'Burning, Poisoned, etc.',
    target: 'selected',
    amount: 'Seconds',
    condition: 'e.g. rollResult > 10',
    trueLabel: 'True',
    falseLabel: 'False',
    name: 'myVar',
    value: '42',
    macroName: 'Macro name',
    macroUuid: 'Macro.UUID',
    ability: 'str, dex, con, int, wis, cha',
    skill: 'prc, inv, ath, acr, ste, ...',
  }

  return (
    <div className="flex h-full">
      {/* Palette sidebar */}
      <div className="w-56 shrink-0 border-r bg-muted/10 flex flex-col overflow-y-auto p-3">
        {paletteSections.map((section) => {
          const collapsed = sectionsCollapsed[section.title] ?? false
          return (
            <div key={section.title} className="mb-3">
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full text-left mb-1.5 hover:text-foreground transition-colors"
              >
                {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {section.icon || null}
                {section.title}
              </button>
              {!collapsed && section.items.map((item) => (
                <button
                  key={item.type + '-' + item.label}
                  onClick={() => addNodeToCanvas(item)}
                  className={cn(
                    'text-left px-2 py-1.5 rounded text-sm hover:bg-accent/50 transition-colors mb-0.5 w-full',
                    item.category === 'macro' && 'text-purple-300 hover:text-purple-200'
                  )}
                >
                  <span className="font-medium">{item.label}</span>
                  <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                </button>
              ))}
            </div>
          )
        })}

        {loadingMacros && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading macros...
          </div>
        )}

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
                    <Label className="text-xs capitalize">
                      {fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <Input
                      className="h-8 text-xs mt-0.5"
                      value={String(val ?? '')}
                      onChange={(e) => updateNodeData(selectedNode, key, e.target.value)}
                      placeholder={fieldPlaceholders[key] || `Enter ${key}...`}
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

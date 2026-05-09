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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Code,
  Trash2,
  GripVertical,
  Loader2,
  ChevronDown,
  ChevronRight,
  Blocks,
  Puzzle,
  Table2,
  Volume2,
  Image,
  Crosshair,
  Shield,
  Skull,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { relay } from '@/lib/relay'

// ─── Types ──────────────────────────────────────────────────

type NodeCategory = 'action' | 'logic' | 'data' | 'macro' | 'module'

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
  // roll table
  tableName?: string
  tableId?: string
  // play sound
  playlistName?: string
  playlistId?: string
  soundName?: string
  // apply status
  statusId?: string
  statusLabel?: string
  // concentration save
  damageAmount?: string
  // death save
  // search actor
  actorQuery?: string
  actorUuid?: string
  [key: string]: unknown
}

type MacroNode = Node<CustomNodeData>
type MacroEdge = Edge

interface PaletteItem {
  type: string
  label: string
  category: NodeCategory
  description: string
  icon?: React.ReactNode
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

interface InstalledModule {
  id: string
  title: string
  active: boolean
  version: string
  description?: string
  authors?: string
}

interface PaletteSection {
  title: string
  icon?: React.ReactNode
  items: PaletteItem[]
}

// ─── Static palette items ───────────────────────────────────

const staticPaletteItems: PaletteItem[] = [
  // Actions
  {
    type: 'rollDice',
    label: 'Roll Dice',
    category: 'action',
    description: 'Roll a dice formula',
    icon: <Blocks className="h-3 w-3 text-blue-400" />,
    defaultData: { formula: '1d20', flavor: '' },
  },
  {
    type: 'dealDamage',
    label: 'Deal Damage',
    category: 'action',
    description: 'Deal damage to selected token',
    icon: <Crosshair className="h-3 w-3 text-red-400" />,
    defaultData: { target: 'selected', amount: '10' },
  },
  {
    type: 'healTarget',
    label: 'Heal Target',
    category: 'action',
    description: 'Heal selected token',
    icon: <Crosshair className="h-3 w-3 text-green-400" />,
    defaultData: { target: 'selected', amount: '10' },
  },
  {
    type: 'sendChat',
    label: 'Send Chat',
    category: 'action',
    description: 'Send a message to chat',
    icon: <Blocks className="h-3 w-3 text-cyan-400" />,
    defaultData: { content: 'Hello!', mode: 'OOC' },
  },
  {
    type: 'applyEffect',
    label: 'Apply Effect',
    category: 'action',
    description: 'Apply an active effect',
    icon: <Blocks className="h-3 w-3 text-yellow-400" />,
    defaultData: { effectName: 'Burning', target: 'selected', amount: '60' },
  },
  {
    type: 'applyStatus',
    label: 'Apply Status',
    category: 'action',
    description: 'Apply a status condition icon',
    icon: <Shield className="h-3 w-3 text-orange-400" />,
    defaultData: { statusId: 'poisoned', statusLabel: 'Poisoned' },
  },
  {
    type: 'abilityCheck',
    label: 'Ability Check',
    category: 'action',
    description: 'Roll an ability check',
    icon: <Blocks className="h-3 w-3 text-indigo-400" />,
    defaultData: { ability: 'str', flavor: '' },
  },
  {
    type: 'skillCheck',
    label: 'Skill Check',
    category: 'action',
    description: 'Roll a skill check',
    icon: <Blocks className="h-3 w-3 text-indigo-400" />,
    defaultData: { skill: 'prc', flavor: '' },
  },
  {
    type: 'concentrationSave',
    label: 'Concentration Save',
    category: 'action',
    description: 'Roll a concentration saving throw',
    icon: <Shield className="h-3 w-3 text-purple-400" />,
    defaultData: { damageAmount: '10' },
  },
  {
    type: 'deathSave',
    label: 'Death Save',
    category: 'action',
    description: 'Roll a death saving throw',
    icon: <Skull className="h-3 w-3 text-red-400" />,
    defaultData: {},
  },
  {
    type: 'rollTable',
    label: 'Roll Table',
    category: 'action',
    description: 'Roll on a random table',
    icon: <Table2 className="h-3 w-3 text-amber-400" />,
    defaultData: { tableName: '', tableId: '' },
  },
  {
    type: 'playSound',
    label: 'Play Sound',
    category: 'action',
    description: 'Play a sound from a playlist',
    icon: <Volume2 className="h-3 w-3 text-emerald-400" />,
    defaultData: { playlistName: '', soundName: '' },
  },
  {
    type: 'toggleScene',
    label: 'Toggle Scene',
    category: 'action',
    description: 'Switch to / activate a scene',
    icon: <Image className="h-3 w-3 text-sky-400" />,
    defaultData: { sceneName: '', sceneId: '' },
  },
  // Logic
  {
    type: 'condition',
    label: 'Condition',
    category: 'logic',
    description: 'If/else branching',
    icon: <Blocks className="h-3 w-3 text-amber-400" />,
    defaultData: { condition: 'true', trueLabel: 'True', falseLabel: 'False' },
  },
  // Data
  {
    type: 'variable',
    label: 'Variable',
    category: 'data',
    description: 'Set or get a variable',
    icon: <Blocks className="h-3 w-3 text-green-400" />,
    defaultData: { name: 'myVar', value: '' },
  },
]

// ─── Module templates ──────────────────────────────────────
// Known module → node types to auto-inject when module is active

const MODULE_NODE_TEMPLATES: Record<
  string,
  { type: string; label: string; description: string; defaultData: Partial<CustomNodeData> }[]
> = {
  'dfreds-convenient-effects': [
    {
      type: 'applyCEffect',
      label: 'Apply CE Effect',
      description: 'Apply a Convenient Effect',
      defaultData: { effectName: 'Burning' },
    },
    {
      type: 'removeCEffect',
      label: 'Remove CE Effect',
      description: 'Remove a Convenient Effect',
      defaultData: { effectName: 'Burning' },
    },
  ],
  'midi-qol': [
    {
      type: 'midiRollAttack',
      label: 'Midi Attack Roll',
      description: 'Roll attack through MidiQoL',
      defaultData: { itemName: '' },
    },
  ],
  'warpgate': [
    {
      type: 'warpgateTeleport',
      label: 'Warp Gate Teleport',
      description: 'Teleport token via Warp Gate',
      defaultData: { targetScene: '' },
    },
  ],
  'tokenmagic': [
    {
      type: 'tokenMagicFX',
      label: 'TokenMagic FX',
      description: 'Apply TokenMagic filter',
      defaultData: { effectName: '' },
    },
  ],
  'sequencer': [
    {
      type: 'sequencerEffect',
      label: 'Sequencer Effect',
      description: 'Play a Sequencer effect',
      defaultData: { effectName: '' },
    },
  ],
}

// ─── Node Component ─────────────────────────────────────────

const categoryColors: Record<NodeCategory, string> = {
  action: 'border-l-blue-500',
  logic: 'border-l-amber-500',
  data: 'border-l-green-500',
  macro: 'border-l-purple-500',
  module: 'border-l-pink-500',
}

function MacroNodeComponent({ data, selected }: { data: CustomNodeData; selected: boolean }) {
  return (
    <Card
      className={cn(
        'min-w-[160px] px-3 py-2 shadow-md border-l-4',
        categoryColors[data.category] || 'border-l-blue-500',
        selected && 'ring-2 ring-primary'
      )}
    >
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

// ─── Helpers ────────────────────────────────────────────────

const MODE_OPTIONS = ['OOC', 'IC', 'EMOTE', 'WHISPER'] as const
const ABILITY_OPTIONS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
const SKILL_OPTIONS = [
  { value: 'acr', label: 'Acrobatics (DEX)' },
  { value: 'ath', label: 'Athletics (STR)' },
  { value: 'ste', label: 'Stealth (DEX)' },
  { value: 'prc', label: 'Perception (WIS)' },
  { value: 'inv', label: 'Investigation (INT)' },
  { value: 'ins', label: 'Insight (WIS)' },
  { value: 'dec', label: 'Deception (CHA)' },
  { value: 'per', label: 'Persuasion (CHA)' },
  { value: 'arc', label: 'Arcana (INT)' },
  { value: 'his', label: 'History (INT)' },
  { value: 'nat', label: 'Nature (INT)' },
  { value: 'rel', label: 'Religion (INT)' },
  { value: 'med', label: 'Medicine (WIS)' },
  { value: 'ani', label: 'Animal Handling (WIS)' },
  { value: 'sur', label: 'Survival (WIS)' },
  { value: 'perf', label: 'Performance (CHA)' },
  { value: 'int', label: 'Intimidation (CHA)' },
] as const

const STATUS_OPTIONS = [
  { id: 'blinded', label: 'Blinded' },
  { id: 'charmed', label: 'Charmed' },
  { id: 'deafened', label: 'Deafened' },
  { id: 'exhaustion', label: 'Exhaustion' },
  { id: 'frightened', label: 'Frightened' },
  { id: 'grappled', label: 'Grappled' },
  { id: 'incapacitated', label: 'Incapacitated' },
  { id: 'invisible', label: 'Invisible' },
  { id: 'paralyzed', label: 'Paralyzed' },
  { id: 'petrified', label: 'Petrified' },
  { id: 'poisoned', label: 'Poisoned' },
  { id: 'prone', label: 'Prone' },
  { id: 'restrained', label: 'Restrained' },
  { id: 'stunned', label: 'Stunned' },
  { id: 'unconscious', label: 'Unconscious' },
  { id: 'concentration', label: 'Concentration' },
]

// ─── Canvas Component ───────────────────────────────────────

function FlowCanvas({ onCodeGenerated, macroName }: { onCodeGenerated: (code: string) => void; macroName: string }) {
  const reactFlowInstance = useReactFlow<Node<CustomNodeData>>()
  const [nodes, setNodes, onNodesChange] = useNodesState<MacroNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<MacroEdge>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [remoteMacros, setRemoteMacros] = useState<RemoteMacro[]>([])
  const [installedModules, setInstalledModules] = useState<InstalledModule[]>([])
  const [loadingMacros, setLoadingMacros] = useState(true)
  const [loadingModules, setLoadingModules] = useState(true)
  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({})

  // ─── Fetch macros from relay ────────────────────────────
  useEffect(() => {
    let mounted = true
    setLoadingMacros(true)
    relay
      .getMacros()
      .then((data) => {
        if (!mounted) return
        const raw: unknown[] =
          data && 'macros' in (data as object)
            ? ((data as Record<string, unknown>).macros as unknown[])
            : data && 'data' in (data as object)
              ? ((data as Record<string, unknown>).data as unknown[])
              : Array.isArray(data)
                ? data
                : []
        const macros: RemoteMacro[] = raw
          .map((m) => {
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
          })
          .filter((m) => m.uuid)
        setRemoteMacros(macros)
        setLoadingMacros(false)
      })
      .catch(() => {
        if (mounted) {
          setRemoteMacros([])
          setLoadingMacros(false)
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  // ─── Fetch modules from relay ───────────────────────────
  useEffect(() => {
    let mounted = true
    setLoadingModules(true)
    relay
      .worldInfo()
      .then((data) => {
        if (!mounted) return
        // apiGet returns { type: 'world-info', data: { modules: [...] } }
        // but might also return flat { type: 'world-info', modules: [...] }
        const payload = (data && 'data' in (data as object)
          ? (data as Record<string, unknown>).data
          : data) as Record<string, unknown> | null
        const rawModules = payload?.modules as InstalledModule[] | undefined
        setInstalledModules(rawModules?.filter((m) => m.active) ?? [])
        setLoadingModules(false)
      })
      .catch(() => {
        if (mounted) {
          setInstalledModules([])
          setLoadingModules(false)
        }
      })
    return () => {
      mounted = false
    }
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

  // Foundry Macros section (dynamic from relay)
  if (remoteMacros.length > 0) {
    paletteSections.push({
      title: `Foundry Macros (${remoteMacros.length})`,
      icon: <Blocks className="h-3 w-3 text-purple-500" />,
      items: remoteMacros.map(
        (m) =>
          ({
            type: 'runMacro',
            label: m.name,
            category: 'macro',
            description: `Run "${m.name}"`,
            defaultData: {
              macroName: m.name,
              macroUuid: m.uuid,
              description: `Execute: ${m.name}`,
            },
          }) as PaletteItem
      ),
    })
  }

  // Foundry Modules section (dynamic from relay world-info)
  const activeModules = installedModules.filter((m) => m.active)
  if (activeModules.length > 0) {
    const moduleItems: PaletteItem[] = []

    // Module entries themselves
    for (const mod of activeModules) {
      moduleItems.push({
        type: 'moduleInfo',
        label: mod.title,
        category: 'module',
        description: mod.description || mod.id,
        icon: <Puzzle className="h-3 w-3 text-pink-400" />,
        defaultData: {
          moduleId: mod.id,
          moduleVersion: mod.version,
          description: mod.title,
        },
      })

      // Known module templates
      const templates = MODULE_NODE_TEMPLATES[mod.id]
      if (templates) {
        for (const tmpl of templates) {
          moduleItems.push({
            type: tmpl.type,
            label: tmpl.label,
            category: 'module',
            description: tmpl.description,
            icon: <Puzzle className="h-3 w-3 text-pink-400" />,
            defaultData: {
              moduleId: mod.id,
              ...tmpl.defaultData,
              description: `${tmpl.description} (${mod.title})`,
            },
          })
        }
      }
    }

    if (moduleItems.length > 0) {
      paletteSections.push({
        title: `Foundry Modules (${activeModules.length})`,
        icon: <Puzzle className="h-3 w-3 text-pink-500" />,
        items: moduleItems,
      })
    }
  }

  const toggleSection = (title: string) => {
    setSectionsCollapsed((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  )

  const addNodeToCanvas = useCallback(
    (item: PaletteItem) => {
      const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const pos =
        reactFlowInstance.screenToFlowPosition({
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
    },
    [reactFlowInstance, setNodes]
  )

  const deleteSelected = useCallback(() => {
    if (!selectedNode) return
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode))
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode && e.target !== selectedNode))
    setSelectedNode(null)
  }, [selectedNode, setNodes, setEdges])

  const updateNodeData = useCallback(
    (nodeId: string, field: string, value: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n
        )
      )
    },
    [setNodes]
  )

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
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id)
    })
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
        case 'applyStatus': {
          const statusId = String(d.statusId || 'poisoned')
          const statusLabel = String(d.statusLabel || statusId)
          lines.push(`// Apply Status: ${statusLabel}`)
          lines.push('if (token) {')
          lines.push(`  const status = CONFIG.statusEffects.find(s => s.id === "${esc(statusId)}")`)
          lines.push('  if (status) {')
          lines.push(
            `    await token.actor.toggleStatusEffect("${esc(statusId)}", { active: true })`
          )
          lines.push('  }')
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
        case 'concentrationSave': {
          const dmg = d.damageAmount || '10'
          lines.push(`// Concentration Save (DC ${dmg})`)
          lines.push('if (token) {')
          lines.push(`  await token.actor.rollConcentrationSave(${parseInt(dmg) || 10})`)
          lines.push('}')
          lines.push('')
          break
        }
        case 'deathSave': {
          lines.push('// Death Save')
          lines.push('if (token) {')
          lines.push('  await token.actor.rollDeathSave({})')
          lines.push('}')
          lines.push('')
          break
        }
        case 'rollTable': {
          const tableName = d.tableName || ''
          lines.push(`// Roll Table: ${tableName}`)
          if (tableName) {
            lines.push(`const table = game.tables.getName("${esc(tableName)}")`)
            lines.push('if (table) {')
            lines.push('  await table.roll()')
            lines.push('}')
          }
          lines.push('')
          break
        }
        case 'playSound': {
          const playlistName = d.playlistName || ''
          const soundName = d.soundName || ''
          lines.push(`// Play Sound`)
          if (playlistName && soundName) {
            lines.push(`const playlist = game.playlists.getName("${esc(playlistName)}")`)
            lines.push('if (playlist) {')
            lines.push(
              `  const sound = playlist.sounds.getName("${esc(soundName)}")`
            )
            lines.push('  if (sound) sound.play()')
            lines.push('}')
          } else if (playlistName) {
            lines.push(`const playlist = game.playlists.getName("${esc(playlistName)}")`)
            lines.push('if (playlist) {')
            lines.push('  playlist.play()')
            lines.push('}')
          }
          lines.push('')
          break
        }
        case 'toggleScene': {
          const sceneName = d.sceneName || ''
          lines.push(`// Toggle Scene: ${sceneName}`)
          if (sceneName) {
            lines.push(`const scene = game.scenes.getName("${esc(sceneName)}")`)
            lines.push('if (scene) {')
            lines.push('  await scene.activate()')
            lines.push('}')
          } else if (d.sceneId) {
            lines.push(`const scene = game.scenes.get("${esc(d.sceneId)}")`)
            lines.push('if (scene) {')
            lines.push('  await scene.activate()')
            lines.push('}')
          }
          lines.push('')
          break
        }
        // Module type node stubs — emit a comment so user can fill in
        case 'moduleInfo': {
          const modId = d.moduleId || ''
          const modVer = d.moduleVersion || ''
          lines.push(`// Module: ${modId} v${modVer}`)
          lines.push(`// Add ${modId} API calls here`)
          lines.push('')
          break
        }
        default: {
          if (
            d.type &&
            Object.values(MODULE_NODE_TEMPLATES).some((templates) =>
              templates.some((t) => t.type === d.type)
            )
          ) {
            lines.push(`// Module Action: ${d.label}`)
            lines.push(`// TODO: Implement ${d.type} API call`)
            lines.push('')
          }
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
    tableName: 'Table Name',
    tableId: 'Table ID',
    playlistName: 'Playlist Name',
    soundName: 'Sound Name',
    sceneName: 'Scene Name',
    sceneId: 'Scene ID',
    statusId: 'Status Effect',
    statusLabel: 'Status Label',
    damageAmount: 'Damage Taken',
    moduleId: 'Module ID',
    moduleVersion: 'Version',
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
    tableName: 'e.g. Treasure Table A',
    playlistName: 'e.g. Battle Music',
    soundName: 'e.g. Thunder01',
    sceneName: 'e.g. The Tavern',
    statusId: 'poisoned, blinded, etc.',
    damageAmount: '10',
  }

  // ─── Determine if a field should be a select dropdown ─────
  const isSelectField = (field: string): boolean => {
    return ['mode', 'ability', 'skill', 'statusId'].includes(field)
  }

  const getSelectOptions = (field: string) => {
    switch (field) {
      case 'mode':
        return MODE_OPTIONS.map((m) => ({ value: m, label: m }))
      case 'ability':
        return ABILITY_OPTIONS.map((a) => ({ value: a, label: a.toUpperCase() }))
      case 'skill':
        return SKILL_OPTIONS.map((s) => ({ value: s.value, label: s.label }))
      case 'statusId':
        return STATUS_OPTIONS.map((s) => ({ value: s.id, label: s.label }))
      default:
        return []
    }
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
              {!collapsed &&
                section.items.map((item) => (
                  <button
                    key={item.type + '-' + item.label}
                    onClick={() => addNodeToCanvas(item)}
                    className={cn(
                      'text-left px-2 py-1.5 rounded text-sm hover:bg-accent/50 transition-colors mb-0.5 w-full flex items-center gap-1.5',
                      item.category === 'macro' && 'text-purple-300 hover:text-purple-200',
                      item.category === 'module' && 'text-pink-300 hover:text-pink-200'
                    )}
                  >
                    {item.icon || null}
                    <span className="font-medium truncate">{item.label}</span>
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
        {loadingModules && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading modules...
          </div>
        )}

        <div className="mt-auto pt-3 border-t space-y-2">
          <Button size="sm" className="w-full gap-1" onClick={exportCode} disabled={nodes.length === 0}>
            <Code className="h-3.5 w-3.5" />
            Export Code
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="w-full gap-1"
            onClick={deleteSelected}
            disabled={!selectedNode}
          >
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
            <div className="space-y-3">
              {Object.entries(selectedNodeData)
                .filter(([key]) => !['type', 'label', 'category', 'description'].includes(key))
                .map(([key, val]) => (
                  <div key={key}>
                    <Label className="text-xs capitalize">
                      {fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    {isSelectField(key) ? (
                      <Select
                        value={String(val ?? '')}
                        onValueChange={(v) => updateNodeData(selectedNode!, key, v ?? '')}
                      >
                        <SelectTrigger className="h-8 text-xs mt-0.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getSelectOptions(key).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="h-8 text-xs mt-0.5"
                        value={String(val ?? '')}
                        onChange={(e) => updateNodeData(selectedNode, key, e.target.value)}
                        placeholder={fieldPlaceholders[key] || `Enter ${key}...`}
                      />
                    )}
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

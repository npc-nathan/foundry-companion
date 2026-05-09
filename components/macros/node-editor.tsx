'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
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
  Handle,
  Position,
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
  Target,
  Search,
  Variable as VariableIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { relay } from '@/lib/relay'
import { getModuleMapping, type ModuleNodeProperty } from '@/lib/module-mappings'

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
  // module-specific
  moduleId?: string
  moduleVersion?: string
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
  // Search / Data Source nodes
  {
    type: 'searchActors',
    label: 'Search Actors',
    category: 'action',
    description: 'Search for an actor by name',
    icon: <Search className="h-3 w-3 text-sky-400" />,
    defaultData: { actorQuery: '', actorUuid: '' },
  },
  {
    type: 'searchTargets',
    label: 'Search Targets',
    category: 'action',
    description: 'Get currently targeted tokens',
    icon: <Target className="h-3 w-3 text-rose-400" />,
    defaultData: {},
  },
  {
    type: 'searchScenes',
    label: 'Search Scenes',
    category: 'action',
    description: 'Get a scene by name',
    icon: <Image className="h-3 w-3 text-teal-400" />,
    defaultData: { sceneName: '' },
  },
  {
    type: 'getActorHP',
    label: 'Get Actor HP',
    category: 'action',
    description: 'Get HP & temp HP from selected token',
    icon: <Shield className="h-3 w-3 text-emerald-400" />,
    defaultData: {},
  },
]

// ─── Node Component ─────────────────────────────────────────

const categoryColors: Record<NodeCategory, string> = {
  action: 'border-l-blue-500',
  logic: 'border-l-amber-500',
  data: 'border-l-green-500',
  macro: 'border-l-purple-500',
  module: 'border-l-pink-500',
}

function MacroNodeComponent({ data, selected }: { data: CustomNodeData; selected: boolean }) {
  const isCondition = data.type === 'condition'
  const dataPorts = NODE_DATA_PORTS[data.type] || []

  const dataTypeColor: Record<string, string> = {
    any: '!border-cyan-400 !bg-cyan-900/60',
    number: '!border-blue-400 !bg-blue-900/60',
    string: '!border-yellow-400 !bg-yellow-900/60',
    actor: '!border-emerald-400 !bg-emerald-900/60',
    token: '!border-rose-400 !bg-rose-900/60',
    scene: '!border-teal-400 !bg-teal-900/60',
    boolean: '!border-purple-400 !bg-purple-900/60',
  }

  return (
    <Card
      className={cn(
        'min-w-[160px] px-3 py-2 shadow-md border-l-4 relative',
        categoryColors[data.category] || 'border-l-blue-500',
        selected && 'ring-2 ring-primary'
      )}
    >
      {/* Execution: Target handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !bg-gray-700 !border-white/40"
      />

      {/* Data Inputs (left side) */}
      {dataPorts
        .filter((p) => p.type === 'input')
        .map((port, i) => (
          <Handle
            key={`data-in-${port.id}`}
            type="target"
            position={Position.Left}
            id={`data-in-${port.id}`}
            className={`!w-2.5 !h-2.5 !border-2 ${dataTypeColor[port.dataType] || dataTypeColor.any}`}
            style={{ top: `${35 + i * 20}%` }}
            title={port.label}
          />
        ))}

      <div className="flex items-center gap-2">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div>
          <div className="text-xs font-semibold">{data.label}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {data.description || data.type}
          </div>
        </div>
      </div>

      {/* Data Outputs (right side) */}
      {dataPorts
        .filter((p) => p.type === 'output')
        .map((port, i) => (
          <Handle
            key={`data-out-${port.id}`}
            type="source"
            position={Position.Right}
            id={`data-out-${port.id}`}
            className={`!w-2.5 !h-2.5 !border-2 ${dataTypeColor[port.dataType] || dataTypeColor.any}`}
            style={{ top: `${35 + i * 20}%` }}
            title={port.label}
          />
        ))}

      {/* Execution: Source handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !bg-gray-700 !border-white/40"
      />
      {/* Condition: two labelled handles */}
      {isCondition && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!w-3 !h-3 !border-2 !bg-green-600 !border-green-300"
            style={{ left: '40%' }}
          />
          <div className="absolute text-[9px] font-bold text-green-400"
            style={{ bottom: -16, left: '37%' }}>
            ✓
          </div>
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!w-3 !h-3 !border-2 !bg-red-600 !border-red-300"
            style={{ left: '60%' }}
          />
          <div className="absolute text-[9px] font-bold text-red-400"
            style={{ bottom: -16, left: '57%' }}>
            ✗
          </div>
        </>
      )}
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

// ─── Data Port Definitions ──────────────────────────────
// Each node type can have data inputs (left side) and data outputs (right side)
// These connect to create data flow separate from execution flow

interface DataPortDef {
  id: string
  label: string
  type: 'input' | 'output'
  dataType: 'any' | 'number' | 'string' | 'boolean' | 'actor' | 'token' | 'scene'
}

const NODE_DATA_PORTS: Record<string, DataPortDef[]> = {
  // Data producers (outputs on right side)
  rollDice: [
    { id: 'result', label: 'Result', type: 'output', dataType: 'number' },
  ],
  variable: [
    { id: 'value', label: 'Value', type: 'output', dataType: 'any' },
  ],
  searchActors: [
    { id: 'actor', label: 'Actor', type: 'output', dataType: 'actor' },
  ],
  searchTargets: [
    { id: 'target', label: 'Target', type: 'output', dataType: 'token' },
  ],
  searchScenes: [
    { id: 'scene', label: 'Scene', type: 'output', dataType: 'scene' },
  ],
  getActorHP: [
    { id: 'hp', label: 'HP', type: 'output', dataType: 'number' },
    { id: 'maxHp', label: 'Max HP', type: 'output', dataType: 'number' },
    { id: 'tempHp', label: 'Temp HP', type: 'output', dataType: 'number' },
  ],
  condition: [
    { id: 'result', label: 'Result', type: 'output', dataType: 'boolean' },
    { id: 'condition', label: 'Expression', type: 'input', dataType: 'string' },
    { id: 'trueTarget', label: 'True Branch', type: 'output', dataType: 'any' },
    { id: 'falseTarget', label: 'False Branch', type: 'output', dataType: 'any' },
  ],
  rollTable: [
    { id: 'result', label: 'Result', type: 'output', dataType: 'string' },
  ],

  // Data consumers (inputs on left side)
  dealDamage: [
    { id: 'amount', label: 'Amount', type: 'input', dataType: 'number' },
    { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
  ],
  healTarget: [
    { id: 'amount', label: 'Amount', type: 'input', dataType: 'number' },
    { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
  ],
  sendChat: [
    { id: 'content', label: 'Content', type: 'input', dataType: 'string' },
  ],
  applyEffect: [
    { id: 'effectName', label: 'Effect Name', type: 'input', dataType: 'string' },
    { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
  ],
  applyStatus: [
    { id: 'statusId', label: 'Status', type: 'input', dataType: 'string' },
  ],
  abilityCheck: [
    { id: 'ability', label: 'Ability', type: 'input', dataType: 'string' },
  ],
  skillCheck: [
    { id: 'skill', label: 'Skill', type: 'input', dataType: 'string' },
  ],
  concentrationSave: [
    { id: 'damageAmount', label: 'Damage', type: 'input', dataType: 'number' },
  ],
  toggleScene: [
    { id: 'scene', label: 'Scene', type: 'input', dataType: 'scene' },
  ],
  runMacro: [
    { id: 'macroUuid', label: 'Macro', type: 'input', dataType: 'string' },
  ],
}

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
  // Cache for dynamic property options
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { value: string; label: string }[]>>({})

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
        const payload = (data && 'data' in (data as object)
          ? (data as Record<string, unknown>).data
          : data) as Record<string, unknown> | null
        const rawModules = payload?.modules as InstalledModule[] | undefined
        const active = rawModules?.filter((m) => m.active) ?? []
        setInstalledModules(active)

        // Build dynamic property options from known modules
        const opts: Record<string, { value: string; label: string }[]> = {}
        for (const mod of active) {
          const mapping = getModuleMapping(mod.id)
          if (!mapping) continue
          for (const nodeDef of mapping.nodes) {
            for (const prop of nodeDef.properties) {
              if (prop.options) {
                opts[`${mod.id}:${nodeDef.type}:${prop.key}`] = prop.options
              }
            }
          }
        }
        setDynamicOptions(opts)
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
  const paletteSections = useMemo<PaletteSection[]>(() => {
    const sections: PaletteSection[] = [
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
      sections.push({
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

    // Foundry Modules section (using module-mappings)
    const activeModules = installedModules.filter((m) => m.active)
    if (activeModules.length > 0) {
      const moduleItems: PaletteItem[] = []

      for (const mod of activeModules) {
        const mapping = getModuleMapping(mod.id)

        if (mapping && mapping.nodes.length > 0) {
          // Group header: module title
          moduleItems.push({
            type: `_section_${mod.id}`,
            label: mod.title,
            category: 'module',
            description: mod.description || mapping.description,
            icon: <Puzzle className="h-3 w-3 text-pink-400" />,
            defaultData: { moduleId: mod.id },
          })

          // Individual nodes from the mapping
          for (const nodeDef of mapping.nodes) {
            const defaults: Record<string, string> = {}
            for (const prop of nodeDef.properties) {
              if (prop.options && prop.options.length > 0) {
                defaults[prop.key] = prop.options[0].value
              } else if (prop.type === 'number') {
                defaults[prop.key] = prop.placeholder || '0'
              } else {
                defaults[prop.key] = ''
              }
            }

            moduleItems.push({
              type: nodeDef.type,
              label: nodeDef.label,
              category: 'module',
              description: `${nodeDef.description} (${mod.title})`,
              icon: <Puzzle className="h-3 w-3 text-pink-400" />,
              defaultData: {
                moduleId: mod.id,
                ...defaults,
              },
            })
          }
        } else {
          // Unknown module — just show the module name with no templates
          moduleItems.push({
            type: '_unknown_module_',
            label: mod.title,
            category: 'module',
            description: mod.description || mod.id,
            icon: <Puzzle className="h-3 w-3 text-pink-400" />,
            defaultData: { moduleId: mod.id, moduleVersion: mod.version, description: mod.title },
          })
        }
      }

      if (moduleItems.length > 0) {
        sections.push({
          title: `Foundry Modules (${activeModules.length})`,
          icon: <Puzzle className="h-3 w-3 text-pink-500" />,
          items: moduleItems,
        })
      }
    }

    return sections
  }, [remoteMacros, installedModules])

  const toggleSection = (title: string) => {
    setSectionsCollapsed((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  const onConnect = useCallback(
    (connection: Connection) => {
      // Detect data connections (left/right handles) vs execution (top/bottom handles)
      const isDataConnection =
        (connection.sourceHandle?.startsWith('data-out-') ?? false) &&
        (connection.targetHandle?.startsWith('data-in-') ?? false)
      const isExecutionConnection =
        !connection.sourceHandle && !connection.targetHandle

      // Validate: don't mix data and execution handles
      if (!isDataConnection && !isExecutionConnection) return

      const edge: Edge = {
        id: `edge-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        type: isDataConnection ? 'dataEdge' : undefined,
        style: isDataConnection
          ? { stroke: '#22d3ee', strokeWidth: 2, strokeDasharray: '5,5' }
          : { stroke: '#555', strokeWidth: 2 },
        animated: false,
      }
      setEdges((eds) => [...eds, edge])
    },
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

  // ─── Export to Code ─────────────────────
  const exportCode = useCallback(() => {
    // edgeMap: execution flow edges (source → targets)
    const execEdgeMap = new Map<string, { target: string; handle: string | null | undefined }[]>()
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    nodes.forEach((n) => execEdgeMap.set(n.id, []))
    edges
      .filter((e) => !e.sourceHandle || e.sourceHandle.startsWith('exec-') || (!e.sourceHandle && !e.targetHandle))
      .forEach((e) => {
        execEdgeMap.get(e.source)?.push({ target: e.target, handle: e.sourceHandle })
      })

    // dataInMap: incoming data connections to each node's input ports
    // key: "targetNodeId:portId" → { sourceNodeId, sourcePortId }
    const dataInMap = new Map<string, { sourceNodeId: string; sourcePortId: string }>()
    for (const e of edges) {
      if (!e.sourceHandle?.startsWith('data-out-') || !e.targetHandle?.startsWith('data-in-')) continue
      const sourcePortId = e.sourceHandle.replace('data-out-', '')
      const targetPortId = e.targetHandle.replace('data-in-', '')
      dataInMap.set(`${e.target}:${targetPortId}`, { sourceNodeId: e.source, sourcePortId })
    }

    // dataOutVar: variable names for output ports
    // convention: _d_{nodeId}_{portId} — e.g. _d_node-abc_result
    function dataVar(nodeId: string, portId: string): string {
      return `_d_${nodeId.replace(/[^a-zA-Z0-9]/g, '_')}_${portId}`
    }

    // Get the source node's data output variable for a target's input port
    function dataForInput(nodeId: string, fieldKey: string): string | null {
      const entry = dataInMap.get(`${nodeId}:${fieldKey}`)
      if (!entry) return null
      const sourcePortDef = (NODE_DATA_PORTS[nodeMap.get(entry.sourceNodeId)?.data?.type || ''] || [])
        .find((p) => p.id === entry.sourcePortId)
      if (!sourcePortDef) return null
      return dataVar(entry.sourceNodeId, entry.sourcePortId)
    }

    const visited = new Set<string>()

    function generateNodeLines(nodeId: string, lines: string[], depth = 0): void {
      if (visited.has(nodeId)) return
      visited.add(nodeId)

      const node = nodeMap.get(nodeId)
      if (!node) return

      const d = node.data
      const indent = '  '.repeat(depth)

      if ((d.type as string).startsWith('_')) return

      // Helper: check if a field value should come from a data pipe
      function fieldVal(fieldKey: string, fallback: string): string {
        const pipeVar = dataForInput(nodeId, fieldKey)
        return pipeVar ? pipeVar : fallback
      }

      // Module-mapped nodes
      const modId = String(d.moduleId || '')
      if (d.category === 'module' && modId) {
        const mapping = getModuleMapping(modId)
        if (mapping) {
          const nodeDef = mapping.nodes.find((n) => n.type === d.type)
          if (nodeDef) {
            const data: Record<string, string> = {}
            for (const prop of nodeDef.properties) {
              data[prop.key] = String(d[prop.key] ?? '')
            }
            for (const cl of nodeDef.generateCode(data)) {
              lines.push(indent + cl)
            }
            for (const edge of execEdgeMap.get(nodeId) || []) {
              if (!edge.handle) generateNodeLines(edge.target, lines, depth)
            }
            return
          }
        }
        lines.push(indent + '// Module: ' + d.label + ' (' + modId + ')')
        lines.push(indent + '// TODO: Add API calls for this module action')
        return
      }

      // Built-in node types
      switch (d.type) {
        case 'rollDice': {
          const formula = d.formula || '1d20'
          lines.push(indent + '// Roll Dice: ' + formula)
          lines.push(indent + 'const roll = await game.dice.roll("' + esc(formula) + '")')
          lines.push(indent + 'await roll.evaluate({ async: true })')
          if (d.flavor) lines.push(indent + 'roll.toMessage({ flavor: "' + esc(d.flavor) + '" })')
          lines.push(indent + 'const ' + dataVar(nodeId, 'result') + ' = roll.total')
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'dealDamage': {
          const damount = fieldVal('amount', d.amount || '10')
          lines.push(indent + '// Deal Damage')
          const targetExpr = fieldVal('target', 'token')
          lines.push(indent + 'const dmgTarget = ' + targetExpr)
          lines.push(indent + 'if (dmgTarget) {')
          lines.push(indent + '  const cur = dmgTarget.actor?.system.attributes.hp.value || 0')
          lines.push(indent + '  const newHp = Math.max(0, cur - (' + damount + '))')
          lines.push(indent + '  await dmgTarget.actor.update({ "system.attributes.hp.value": newHp })')
          lines.push(indent + '  ChatMessage.create({ content: dmgTarget.name + " takes ' + esc(d.amount || '10') + ' damage." })')
          lines.push(indent + '}')
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'healTarget': {
          const hamount = fieldVal('amount', d.amount || '10')
          lines.push(indent + '// Heal Target')
          const htargetExpr = fieldVal('target', 'token')
          lines.push(indent + 'const healTarget_ = ' + htargetExpr)
          lines.push(indent + 'if (healTarget_) {')
          lines.push(indent + '  const cur = healTarget_.actor?.system.attributes.hp.value || 0')
          lines.push(indent + '  const max = healTarget_.actor?.system.attributes.hp.max || 999')
          lines.push(indent + '  const newHp = Math.min(max, cur + (' + hamount + '))')
          lines.push(indent + '  await healTarget_.actor.update({ "system.attributes.hp.value": newHp })')
          lines.push(indent + '  ChatMessage.create({ content: healTarget_.name + " heals for ' + esc(d.amount || '10') + '." })')
          lines.push(indent + '}')
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'sendChat': {
          const content = fieldVal('content', String(d.content || ''))
          const mode = d.mode === 'IC' ? 'IC' : 'OOC'
          lines.push(indent + '// Send Chat Message')
          lines.push(indent + 'ChatMessage.create({')
          lines.push(indent + '  content: String(' + content + '),')
          lines.push(indent + '  type: CONST.CHAT_MESSAGE_TYPES.' + mode + ',')
          lines.push(indent + '})')
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'applyEffect': {
          const effectName = fieldVal('effectName', String(d.effectName || ''))
          const targetExpr = fieldVal('target', 'token')
          const dur = d.amount || '60'
          lines.push(indent + '// Apply Effect')
          lines.push(indent + 'const applyTarget = ' + targetExpr)
          lines.push(indent + 'if (applyTarget) {')
          lines.push(indent + '  const effectData = {')
          lines.push(indent + '    label: String(' + effectName + '),')
          lines.push(indent + '    origin: applyTarget.actor?.uuid,')
          lines.push(indent + '    duration: { seconds: ' + (parseInt(dur) || 60) + ' }')
          lines.push(indent + '  }')
          lines.push(indent + '  await applyTarget.actor?.createEmbeddedDocuments("ActiveEffect", [effectData])')
          lines.push(indent + '}')
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'applyStatus': {
          const statusId = fieldVal('statusId', String(d.statusId || 'poisoned'))
          lines.push(indent + '// Apply Status')
          lines.push(indent + 'if (token) {')
          lines.push(indent + '  await token.actor.toggleStatusEffect(String(' + statusId + '), { active: true })')
          lines.push(indent + '}')
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'condition': {
          const cond = fieldVal('condition', String(d.condition || 'true'))
          lines.push(indent + '// Condition')
          lines.push(indent + 'if (' + cond + ') {')
          const trueEdges = (execEdgeMap.get(nodeId) || []).filter((e) => e.handle === 'true')
          for (const te of trueEdges) {
            generateNodeLines(te.target, lines, depth + 1)
          }
          const falseEdges = (execEdgeMap.get(nodeId) || []).filter((e) => e.handle === 'false')
          if (falseEdges.length > 0) {
            lines.push(indent + '} else {')
            for (const fe of falseEdges) {
              generateNodeLines(fe.target, lines, depth + 1)
            }
          }
          lines.push(indent + '}')
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'variable': {
          const varName = String(d.name || 'myVar')
          const varValue = String(d.value || 'undefined')
          lines.push(indent + '// Variable: ' + varName)
          lines.push(indent + 'const ' + varName + ' = ' + varValue)
          lines.push(indent + 'const ' + dataVar(nodeId, 'value') + ' = ' + varName)
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'runMacro': {
          const macroName = d.macroName || ''
          lines.push(indent + '// Run Macro: ' + macroName)
          const macroRef = fieldVal('macroUuid', '')
          if (macroRef && macroRef !== macroName) {
            lines.push(indent + 'game.macros.get("' + esc(macroRef) + '")?.execute()')
          } else if (macroName) {
            lines.push(indent + 'game.macros.getName("' + esc(macroName) + '")?.execute()')
          }
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'abilityCheck': {
          const ability = fieldVal('ability', d.ability || 'str')
          const flavors = d.flavor ? ', { flavor: "' + esc(d.flavor) + '" }' : ''
          lines.push(indent + '// Ability Check')
          lines.push(indent + 'if (token) {')
          lines.push(indent + '  await token.actor.rollAbilityTest(String(' + ability + ')' + flavors + ')')
          lines.push(indent + '}')
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'skillCheck': {
          const skill = fieldVal('skill', d.skill || 'prc')
          const flavors = d.flavor ? ', { flavor: "' + esc(d.flavor) + '" }' : ''
          lines.push(indent + '// Skill Check')
          lines.push(indent + 'if (token) {')
          lines.push(indent + '  await token.actor.rollSkill(String(' + skill + ')' + flavors + ')')
          lines.push(indent + '}')
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'concentrationSave': {
          const dmg = fieldVal('damageAmount', d.damageAmount || '10')
          lines.push(indent + '// Concentration Save')
          lines.push(indent + 'if (token) {')
          lines.push(indent + '  await token.actor.rollConcentrationSave(Number(' + dmg + '))')
          lines.push(indent + '}')
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'deathSave': {
          lines.push(indent + '// Death Save')
          lines.push(indent + 'if (token) {')
          lines.push(indent + '  await token.actor.rollDeathSave({})')
          lines.push(indent + '}')
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'rollTable': {
          const tableName = d.tableName || ''
          lines.push(indent + '// Roll Table: ' + tableName)
          if (tableName) {
            lines.push(indent + 'const table = game.tables.getName("' + esc(tableName) + '")')
            lines.push(indent + 'if (table) {')
            lines.push(indent + '  await table.roll()')
            lines.push(indent + '}')
          }
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'playSound': {
          const playlistName = d.playlistName || ''
          const soundName = d.soundName || ''
          lines.push(indent + '// Play Sound')
          if (playlistName && soundName) {
            lines.push(indent + 'const playlist = game.playlists.getName("' + esc(playlistName) + '")')
            lines.push(indent + 'if (playlist) {')
            lines.push(indent + '  const sound = playlist.sounds.getName("' + esc(soundName) + '")')
            lines.push(indent + '  if (sound) sound.play()')
            lines.push(indent + '}')
          } else if (playlistName) {
            lines.push(indent + 'const playlist = game.playlists.getName("' + esc(playlistName) + '")')
            lines.push(indent + 'if (playlist) {')
            lines.push(indent + '  playlist.play()')
            lines.push(indent + '}')
          }
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'toggleScene': {
          const sceneRef = fieldVal('scene', '')
          const sceneName = d.sceneName || ''
          lines.push(indent + '// Toggle Scene: ' + sceneName)
          if (sceneRef) {
            lines.push(indent + 'if (' + sceneRef + ') {')
            lines.push(indent + '  await ' + sceneRef + '.activate()')
            lines.push(indent + '}')
          } else if (sceneName) {
            lines.push(indent + 'const scene = game.scenes.getName("' + esc(sceneName) + '")')
            lines.push(indent + 'if (scene) {')
            lines.push(indent + '  await scene.activate()')
            lines.push(indent + '}')
          } else if (d.sceneId) {
            lines.push(indent + 'const scene = game.scenes.get("' + esc(d.sceneId) + '")')
            lines.push(indent + 'if (scene) {')
            lines.push(indent + '  await scene.activate()')
            lines.push(indent + '}')
          }
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        // Data source nodes (produce variables)
        case 'searchActors': {
          const query = d.actorQuery || ''
          lines.push(indent + '// Search Actors: ' + query)
          lines.push(indent + 'const ' + dataVar(nodeId, 'actor') + ' = ' + (query
            ? 'game.actors.getName("' + esc(query) + '") || canvas.tokens.placeables.find(t => t.name === "' + esc(query) + '")?.actor'
            : 'game.user.targets.first()?.actor'))
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'searchTargets': {
          lines.push(indent + '// Search Targets')
          lines.push(indent + 'const ' + dataVar(nodeId, 'target') + ' = game.user.targets.first() || token')
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'searchScenes': {
          const sName = d.sceneName || ''
          lines.push(indent + '// Search Scenes: ' + sName)
          if (sName) {
            lines.push(indent + 'const ' + dataVar(nodeId, 'scene') + ' = game.scenes.getName("' + esc(sName) + '") || game.scenes.get("' + esc(sName) + '")')
          } else {
            lines.push(indent + 'const ' + dataVar(nodeId, 'scene') + ' = canvas.scene')
          }
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        case 'getActorHP': {
          lines.push(indent + '// Get Actor HP')
          lines.push(indent + 'if (token) {')
          lines.push(indent + '  const hpData = token.actor.system.attributes.hp')
          lines.push(indent + '  const ' + dataVar(nodeId, 'hp') + ' = hpData.value')
          lines.push(indent + '  const ' + dataVar(nodeId, 'maxHp') + ' = hpData.max')
          lines.push(indent + '  const ' + dataVar(nodeId, 'tempHp') + ' = hpData.temp || 0')
          lines.push(indent + '}')
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
          break
        }
        default: {
          lines.push(indent + '// Unknown node: ' + d.label + ' (' + d.type + ')')
          for (const edge of execEdgeMap.get(nodeId) || []) {
            if (!edge.handle) generateNodeLines(edge.target, lines, depth)
          }
        }
      }
    }

    const lines: string[] = []
    lines.push('// Generated from node graph: ' + (macroName || 'Untitled Macro'))
    lines.push('')
    lines.push('async function executeMacro() {')
    lines.push('  const token = canvas.tokens.controlled[0]')
    lines.push('  if (!token) { ui.notifications.warn("Select a token first"); return }')

    const hasIncoming = new Set<string>()
    edges.forEach((e) => {
      // Only count execution edges for root detection
      if (!e.sourceHandle || e.sourceHandle.startsWith('exec-') || (!e.sourceHandle && !e.targetHandle)) {
        hasIncoming.add(e.target)
      }
    })
    const roots = nodes
      .filter((n) => !hasIncoming.has(n.id) && !(n.data.type as string).startsWith('_'))
      .map((n) => n.id)

    const allNonHeader = nodes
      .filter((n) => !(n.data.type as string).startsWith('_'))
      .map((n) => n.id)

    for (const rootId of roots) {
      visited.clear()
      generateNodeLines(rootId, lines)
    }

    if (roots.length === 0) {
      for (const nid of allNonHeader) {
        visited.clear()
        generateNodeLines(nid, lines)
      }
    }

    lines.push('}')
    lines.push('executeMacro()')
    onCodeGenerated(lines.join('\\n'))
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
    duration: 'Duration',
    effectFile: 'Effect File Path',
    scale: 'Scale',
    soundFile: 'Sound File Path',
    volume: 'Volume',
    weatherType: 'Weather Type',
    intensity: 'Intensity',
    filterType: 'Filter',
    itemName: 'Item Name',
    targetName: 'Token Name',
    tileName: 'Tile Name',
    animationType: 'Animation Type',
    elevation: 'Elevation',
    rangeBottom: 'Range Bottom',
    rangeTop: 'Range Top',
    wallName: 'Wall/Door Ref',
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
    effectFile: 'modules/jb2a/...',
    soundFile: 'modules/.../sound.ogg',
    itemName: 'e.g. Longsword',
    targetName: 'e.g. Goblin 1',
    tileName: 'e.g. Trap Door',
    elevation: '1',
    rangeBottom: '0',
    rangeTop: '5',
    wallName: 'Wall ID or direction',
  }

  // ─── Determine if a field should be a select dropdown ─────
  const isSelectField = useCallback(
    (field: string, nodeData: CustomNodeData | null): boolean => {
      if (!nodeData) return ['mode', 'ability', 'skill', 'statusId'].includes(field)

      // Check if this is a mapped module property with options
      const modId = String(nodeData.moduleId || '')
      if (modId) {
        const mapping = getModuleMapping(modId)
        if (mapping) {
          const nodeDef = mapping.nodes.find((n) => n.type === nodeData.type)
          if (nodeDef) {
            const prop = nodeDef.properties.find((p) => p.key === field)
            if (prop && (prop.type === 'select' || prop.options)) return true
          }
        }
      }

      return ['mode', 'ability', 'skill', 'statusId'].includes(field)
    },
    []
  )

  const getSelectOptions = useCallback(
    (field: string, nodeData: CustomNodeData | null) => {
      // Standard fields first
      switch (field) {
        case 'mode':
          return MODE_OPTIONS.map((m) => ({ value: m, label: m }))
        case 'ability':
          return ABILITY_OPTIONS.map((a) => ({ value: a, label: a.toUpperCase() }))
        case 'skill':
          return SKILL_OPTIONS.map((s) => ({ value: s.value, label: s.label }))
        case 'statusId':
          return STATUS_OPTIONS.map((s) => ({ value: s.id, label: s.label }))
      }

      // Module-mapped property
      if (nodeData) {
        const modId = String(nodeData.moduleId || '')
        if (modId) {
          const mapping = getModuleMapping(modId)
          if (mapping) {
            const nodeDef = mapping.nodes.find((n) => n.type === nodeData.type)
            if (nodeDef) {
              const prop = nodeDef.properties.find((p) => p.key === field)
              if (prop?.options) return prop.options
              // Check dynamic cache
              const cacheKey = `${modId}:${nodeData.type}:${field}`
              if (dynamicOptions[cacheKey]) return dynamicOptions[cacheKey]
            }
          }
        }
      }

      return []
    },
    [dynamicOptions]
  )

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
                section.items.map((item) => {
                  // Check if this is a section header (group) within module items
                  if (item.type.startsWith('_section_')) {
                    return (
                      <div
                        key={item.type}
                        className="px-2 py-1 mt-2 mb-0.5 text-[11px] font-semibold text-pink-400 uppercase tracking-wider border-b border-pink-500/20"
                      >
                        {item.label}
                      </div>
                    )
                  }

                  return (
                    <button
                      key={item.type + '-' + item.label}
                      onClick={() => addNodeToCanvas(item)}
                      className={cn(
                        'text-left px-2 py-1.5 rounded text-sm hover:bg-accent/50 transition-colors mb-0.5 w-full flex items-center gap-1.5',
                        item.category === 'macro' && 'text-purple-300 hover:text-purple-200',
                        item.category === 'module' && 'text-pink-300 hover:text-pink-200',
                        item.type === '_unknown_module_' && 'opacity-60 cursor-default'
                      )}
                      disabled={item.type === '_unknown_module_'}
                    >
                      {item.icon || null}
                      <span className={cn(
                        'font-medium truncate',
                        item.type === '_unknown_module_' && 'text-muted-foreground'
                      )}>
                        {item.label}
                      </span>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.type === '_unknown_module_' ? 'No available actions' : item.description}
                      </p>
                    </button>
                  )
                })}
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
                    {isSelectField(key, selectedNodeData) ? (
                      <Select
                        value={String(val ?? '')}
                        onValueChange={(v) => updateNodeData(selectedNode!, key, v ?? '')}
                      >
                        <SelectTrigger className="h-8 text-xs mt-0.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getSelectOptions(key, selectedNodeData).length > 0
                            ? getSelectOptions(key, selectedNodeData).map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))
                            : null}
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

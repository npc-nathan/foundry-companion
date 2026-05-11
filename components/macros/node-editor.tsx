'use client'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
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
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { relay } from '@/lib/relay'
import { getModuleMapping, type ModuleNodeProperty } from '@/lib/module-mappings'
import {
  getNodeFields,
  type NodeFieldDef,
} from '@/lib/node-schemas'
import { ExpressionEditor, type ExpressionConfig, expressionConfigToCode } from '@/components/macros/expression-editor'
import { edgeTypes } from '@/components/macros/data-edge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Dialog } from '@/components/ui/dialog'
import {
  getNodeSchema,
  getPortFields,
} from '@/lib/node-schemas'

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
  compareField?: string
  compareValue?: string
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
  // concentration save
  damageAmount?: string
  // death save
  // search actor
  actorQuery?: string
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
    defaultData: { amount: '10' },
  },
  {
    type: 'healTarget',
    label: 'Heal Target',
    category: 'action',
    description: 'Heal selected token',
    icon: <Crosshair className="h-3 w-3 text-green-400" />,
    defaultData: { amount: '10' },
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
    defaultData: { effectName: 'Burning', amount: '60' },
  },
  {
    type: 'applyStatus',
    label: 'Apply Status',
    category: 'action',
    description: 'Apply a status condition icon',
    icon: <Shield className="h-3 w-3 text-orange-400" />,
    defaultData: { statusId: 'poisoned' },
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
    defaultData: { condition: 'true', compareField: 'name', compareValue: '' },
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
    defaultData: { actorQuery: '' },
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
        id="exec-in"
        className="!w-3 !h-3 !border-2 !bg-gray-700 !border-white/40"
      />

      {/* Data Inputs (left side) */}
      {dataPorts
        .filter((p) => p.type === 'input')
        .map((port, i) => {
          const schema = getNodeSchema(data.type)
          const portSchema = schema?.outputs?.find((p) => p.portId === port.id)
          const fields = portSchema?.fields
          const example = schema?.example?.[port.id]

          return (
            <Tooltip key={`data-in-${port.id}`}>
              <TooltipTrigger>
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`data-in-${port.id}`}
                  className={`!w-2.5 !h-2.5 !border-2 ${dataTypeColor[port.dataType] || dataTypeColor.any}`}
                  style={{ top: `${35 + i * 20}%` }}
                />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs p-2">
                <div className="text-xs font-semibold mb-1">{port.label}</div>
                <div className="text-[10px] text-muted-foreground">Type: {port.dataType}</div>
                {fields && fields.length > 0 && fields[0].key !== '' && (
                  <div className="mt-1.5 text-[10px]">
                    <div className="font-medium mb-0.5">Available fields:</div>
                    {fields.slice(0, 8).map((f) => (
                      <div key={f.key} className="flex gap-2 items-baseline">
                        <span className="text-muted-foreground">{f.label}</span>
                        <span className="text-[9px] text-muted-foreground/50">({f.type})</span>
                      </div>
                    ))}
                    {fields.length > 8 && (
                      <div className="text-[9px] text-muted-foreground/50 mt-0.5">
                        +{fields.length - 8} more fields...
                      </div>
                    )}
                  </div>
                )}
                {example !== undefined && (
                  <div className="mt-1 text-[10px]">
                    <span className="text-muted-foreground">e.g. </span>
                    <code className="text-[9px] bg-muted px-1 rounded">{String(example)}</code>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          )
        })}

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
        .filter((p) => !isCondition || (p.id !== 'trueTarget' && p.id !== 'falseTarget'))
        .map((port, i) => {
          const schema = getNodeSchema(data.type)
          const portSchema = schema?.outputs?.find((p) => p.portId === port.id)
          const fields = portSchema?.fields
          const example = schema?.example?.[port.id]

          return (
            <Tooltip key={`data-out-${port.id}`}>
              <TooltipTrigger>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`data-out-${port.id}`}
                  className={`!w-2.5 !h-2.5 !border-2 ${dataTypeColor[port.dataType] || dataTypeColor.any}`}
                  style={{ top: `${35 + i * 20}%` }}
                />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs p-2">
                <div className="text-xs font-semibold mb-1">{port.label}</div>
                <div className="text-[10px] text-muted-foreground">Type: {port.dataType}</div>
                {fields && fields.length > 0 && fields[0].key !== '' && (
                  <div className="mt-1.5 text-[10px]">
                    <div className="font-medium mb-0.5">Available fields:</div>
                    {fields.slice(0, 10).map((f) => (
                      <div key={f.key} className="flex gap-2 items-baseline">
                        <span className="text-muted-foreground">{f.label}</span>
                        <span className="text-[9px] text-muted-foreground/50">({f.type})</span>
                      </div>
                    ))}
                    {fields.length > 10 && (
                      <div className="text-[9px] text-muted-foreground/50 mt-0.5">
                        +{fields.length - 10} more fields...
                      </div>
                    )}
                  </div>
                )}
                {fields && fields.length > 0 && fields[0].key === '' && (
                  <div className="mt-1 text-[10px]">
                    <span className="text-muted-foreground">Scalar value — connects directly</span>
                  </div>
                )}
                {example !== undefined && (
                  <div className="mt-1 text-[10px]">
                    <span className="text-muted-foreground">e.g. </span>
                    <code className="text-[9px] bg-muted px-1 rounded">{typeof example === 'object' ? JSON.stringify(example) : String(example)}</code>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          )
        })}

      {/* Execution: Source handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="exec-out"
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
  isNew?: boolean
  currentMacroId?: string | null
  onMacroFieldChange?: (field: string, value: string) => void
  onSave?: () => void
  onRun?: () => void
  onDelete?: () => void
  isSaving?: boolean
  isRunning?: boolean
  isDeleting?: boolean
  initialNodes?: unknown[] | null
  initialEdges?: unknown[] | null
  onNodeGraphChange?: (nodes: unknown[], edges: unknown[]) => void
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

function FlowCanvas({ currentCode, onCodeGenerated, macroName, isNew, currentMacroId, onMacroFieldChange, onSave, onRun, onDelete, isSaving, isRunning, isDeleting, initialNodes, initialEdges, onNodeGraphChange }: Props) {
  const reactFlowInstance = useReactFlow<Node<CustomNodeData>>()
  const [nodes, setNodes, onNodesChange] = useNodesState<MacroNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<MacroEdge>([])
  // Load initial node graph from props (only on mount, not on every render)
  const loadedRef = useRef(false)
  useEffect(() => {
    if (initialNodes && initialEdges && initialNodes.length > 0 && !loadedRef.current) {
      setNodes(initialNodes as MacroNode[])
      setEdges(initialEdges as MacroEdge[])
      loadedRef.current = true
    }
    if (!initialNodes || !initialEdges || initialNodes.length === 0) {
      loadedRef.current = false
    }
  }, [initialNodes, initialEdges, setNodes, setEdges])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [remoteMacros, setRemoteMacros] = useState<RemoteMacro[]>([])
  const [installedModules, setInstalledModules] = useState<InstalledModule[]>([])
  const [loadingMacros, setLoadingMacros] = useState(true)
  const [loadingModules, setLoadingModules] = useState(true)
  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({})
  // Cache for dynamic property options
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { value: string; label: string }[]>>({})
  // Expression editor state
  const [exprEditorOpen, setExprEditorOpen] = useState(false)
  const [exprEditorFieldKey, setExprEditorFieldKey] = useState<string | null>(null)
  const [exprEditorConfigs, setExprEditorConfigs] = useState<Record<string, ExpressionConfig>>({})
  // Node details dialog (double-click)
  const [detailsDialogNode, setDetailsDialogNode] = useState<MacroNode | null>(null)

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
        (connection.sourceHandle === 'exec-out' || connection.sourceHandle === null || connection.sourceHandle === undefined) &&
        (connection.targetHandle === 'exec-in' || connection.targetHandle === null || connection.targetHandle === undefined) &&
        !connection.sourceHandle?.startsWith('data-out-') &&
        !connection.targetHandle?.startsWith('data-in-')

      // Validate: don't mix data and execution handles
      if (!isDataConnection && !isExecutionConnection) return

      // Extract dataType from the source port definition for edge labels
      let dataType = 'any'
      if (isDataConnection && connection.source) {
        const sourceNode = nodes.find((n) => n.id === connection.source)
        const portId = connection.sourceHandle?.replace('data-out-', '')
        if (sourceNode && portId) {
          const portDefs = NODE_DATA_PORTS[sourceNode.data.type] || []
          const portDef = portDefs.find((p) => p.id === portId)
          if (portDef) dataType = portDef.dataType
        }
      }

      const edge: Edge = {
        id: `edge-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        type: 'custom',
        data: { dataType: isDataConnection ? dataType : 'exec' },
      }
      setEdges((eds) => [...eds, edge])
    },
    [setEdges, nodes]
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

  const setSelectedNodeDetailsDialog = useCallback((node: MacroNode) => {
    setDetailsDialogNode(node)
  }, [])

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

    const generatedNodes = new Set<string>()

    function generateNodeLines(nodeId: string, lines: string[], depth = 0, recurseChildren = true): void {
      if (generatedNodes.has(nodeId)) return
      generatedNodes.add(nodeId)

      const node = nodeMap.get(nodeId)
      if (!node) return

      const d = node.data
      const indent = '  '.repeat(depth)

      if ((d.type as string).startsWith('_')) return

      // Helper: check if a field value should come from a data pipe
      function fieldVal(fieldKey: string, fallback: string): string {
        const pipeVar = dataForInput(nodeId, fieldKey)
        if (pipeVar) return pipeVar
        const nodeVal = String(d[fieldKey] ?? '')
        return nodeVal || fallback
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
          lines.push(indent + '// Roll Dice: ' + formula + ' -> e.g. result: 17')
          lines.push(indent + 'const roll = new Roll("' + esc(formula) + '")')
          lines.push(indent + 'await roll.evaluate({ async: true })')
          if (d.flavor) lines.push(indent + 'roll.toMessage({ flavor: "' + esc(d.flavor) + '" })')
          lines.push(indent + 'const ' + dataVar(nodeId, 'result') + ' = roll.total')

          break
        }
        case 'dealDamage': {
          const damount = fieldVal('amount', d.amount || '10')
          const dmgAmountVal = '(' + damount + ')'
          lines.push(indent + '// Deal Damage -> e.g. -10 HP, chat: "Goblin takes 10 damage."')
          const targetExpr = fieldVal('target', 'token')
          lines.push(indent + 'const dmgTarget = ' + targetExpr)
          lines.push(indent + 'const actorRef = dmgTarget?.actor || dmgTarget')
          lines.push(indent + 'if (actorRef) {')
          lines.push(indent + '  let dmgTotal = ' + dmgAmountVal)
          lines.push(indent + '  // Support dice formulas like 1d8+3')
          lines.push(indent + "  if (typeof dmgTotal === 'string' && /^\\d*d\\d/i.test(dmgTotal)) {")
          lines.push(indent + '    const r = await new Roll(dmgTotal).evaluate({ async: true })')
          lines.push(indent + '    dmgTotal = r.total')
          lines.push(indent + '  }')
          lines.push(indent + '  const cur = actorRef.system.attributes.hp.value || 0')
          lines.push(indent + '  const newHp = Math.max(0, cur - dmgTotal)')
          lines.push(indent + '  await actorRef.update({ "system.attributes.hp.value": newHp })')
          lines.push(indent + '  ChatMessage.create({ content: (dmgTarget.name || actorRef.name) + " takes " + dmgTotal + " damage." })')
          lines.push(indent + '}')

          break
        }
        case 'healTarget': {
          const hamount = fieldVal('amount', d.amount || '10')
          const healAmountVal = '(' + hamount + ')'
          lines.push(indent + '// Heal Target -> e.g. +10 HP, chat shows name heals for amount.')
          const htargetExpr = fieldVal('target', 'token')
          lines.push(indent + 'const healTarget_ = ' + htargetExpr)
          lines.push(indent + 'const hActorRef = healTarget_?.actor || healTarget_')
          lines.push(indent + 'if (hActorRef) {')
          lines.push(indent + '  const cur = hActorRef.system.attributes.hp.value || 0')
          lines.push(indent + '  const max = hActorRef.system.attributes.hp.max || 999')
          lines.push(indent + '  const newHp = Math.min(max, cur + ' + healAmountVal + ')')
          lines.push(indent + '  await hActorRef.update({ "system.attributes.hp.value": newHp })')
          lines.push(indent + '  ChatMessage.create({ content: (healTarget_.name || hActorRef.name) + " heals for " + ' + healAmountVal + ' + "." })')
          lines.push(indent + '}')

          break
        }
        case 'sendChat': {
          const content = fieldVal('content', String(d.content || ''))
          const mode = d.mode === 'IC' ? 'IC' : 'OOC'
          lines.push(indent + "// Send Chat Message -> e.g. OOC: The goblin collapses!")
          lines.push(indent + 'ChatMessage.create({')
          lines.push(indent + '  content: String(' + content + '),')
          lines.push(indent + '  type: CONST.CHAT_MESSAGE_TYPES.' + mode + ',')
          lines.push(indent + '})')

          break
        }
        case 'applyEffect': {
          const effectName = fieldVal('effectName', String(d.effectName || ''))
          const targetExpr = fieldVal('target', 'token')
          const dur = d.amount || '60'
          lines.push(indent + '// Apply Effect -> e.g. applies Burning for 60s to selected token')
          lines.push(indent + 'const applyTarget = ' + targetExpr)
          lines.push(indent + 'const applyActor = applyTarget?.actor || applyTarget')
          lines.push(indent + 'if (applyActor) {')
          lines.push(indent + '  const effectData = {')
          lines.push(indent + '    label: String(' + effectName + '),')
          lines.push(indent + '    origin: applyActor.uuid,')
          lines.push(indent + '    duration: { seconds: ' + (parseInt(dur) || 60) + ' }')
          lines.push(indent + '  }')
          lines.push(indent + '  await applyActor.createEmbeddedDocuments("ActiveEffect", [effectData])')
          lines.push(indent + '}')

          break
        }
        case 'applyStatus': {
          const statusId = fieldVal('statusId', String(d.statusId || 'poisoned'))
          lines.push(indent + '// Apply Status -> e.g. toggles poisoned icon on selected token')
          lines.push(indent + 'if (token) {')
          lines.push(indent + '  await token.actor.toggleStatusEffect(String(' + statusId + '), { active: true })')
          lines.push(indent + '}')

          break
        }
        case 'condition': {
          // Check if there's an expression config stored on the node
          const rawExprCfg = String(d._exprConfig_condition || '')
          let exprCode: string | null = null
          if (rawExprCfg) {
            try {
              const parsedConfig: ExpressionConfig = JSON.parse(rawExprCfg)
              exprCode = expressionConfigToCode(parsedConfig, nodeId, nodes.map((n) => ({ id: n.id, data: n.data as unknown as Record<string, unknown> })))
            } catch {}
          }
          if (exprCode) {
            lines.push(indent + `// Condition -> Expression Builder: ${exprCode}`)
            lines.push(indent + `if (${exprCode}) {`)
          } else {
            // Fallback: raw expression text or data pipe
            const pipedVar = dataForInput(nodeId, 'condition')
            const cond = pipedVar || fieldVal('condition', String(d.condition || 'true'))
            lines.push(indent + '// Condition -> e.g. if (rollTotal > 10) { ... } else { ... }')
            lines.push(indent + 'if (' + cond + ') {')
          }
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

          break
        }
        case 'variable': {
          const varName = String(d.name || 'myVar')
          const varValue = String(d.value || '')
          const safeValue = varValue || 'undefined'
          lines.push(indent + '// Variable: ' + varName + ' -> e.g. const ' + varName + ' = 42')
          lines.push(indent + 'const ' + varName + ' = ' + safeValue)
          lines.push(indent + 'const ' + dataVar(nodeId, 'value') + ' = ' + varName)

          break
        }
        case 'runMacro': {
          const macroName = d.macroName || ''
          lines.push(indent + '// Run Macro: ' + macroName + ' -> executes Fireball from Foundry macros')
          const macroRef = fieldVal('macroUuid', '')
          if (macroRef && macroRef !== macroName) {
            lines.push(indent + 'game.macros.get("' + esc(macroRef) + '")?.execute()')
          } else if (macroName) {
            lines.push(indent + 'game.macros.getName("' + esc(macroName) + '")?.execute()')
          }

          break
        }
        case 'abilityCheck': {
          const ability = fieldVal('ability', d.ability || 'str')
          const flavors = d.flavor ? ', { flavor: "' + esc(d.flavor) + '" }' : ''
          lines.push(indent + '// Ability Check -> e.g. STR check: d20 + modifier, result shown in chat')
          lines.push(indent + 'if (token) {')
          lines.push(indent + '  await token.actor.rollAbilityTest(String(' + ability + ')' + flavors + ')')
          lines.push(indent + '}')

          break
        }
        case 'skillCheck': {
          const skill = fieldVal('skill', d.skill || 'prc')
          const flavors = d.flavor ? ', { flavor: "' + esc(d.flavor) + '" }' : ''
          lines.push(indent + '// Skill Check -> e.g. Perception check: d20 + WIS, result shown in chat')
          lines.push(indent + 'if (token) {')
          lines.push(indent + '  await token.actor.rollSkill(String(' + skill + ')' + flavors + ')')
          lines.push(indent + '}')

          break
        }
        case 'concentrationSave': {
          const dmg = fieldVal('damageAmount', d.damageAmount || '10')
          lines.push(indent + '// Concentration Save -> e.g. DC 10 CON save for 14 damage taken')
          lines.push(indent + 'if (token) {')
          lines.push(indent + '  await token.actor.rollConcentrationSave(Number(' + dmg + '))')
          lines.push(indent + '}')

          break
        }
        case 'deathSave': {
          lines.push(indent + '// Death Save -> e.g. d20 roll, success/fail tracked automatically')
          lines.push(indent + 'if (token) {')
          lines.push(indent + '  await token.actor.rollDeathSave({})')
          lines.push(indent + '}')

          break
        }
        case 'rollTable': {
          const tableName = d.tableName || ''
          const tableId = d.tableId || ''
          lines.push(indent + '// Roll Table: ' + (tableName || tableId) + " -> e.g. rolled: Potion of Healing")
          const tableRef = tableName ? 'game.tables.getName("' + esc(tableName) + '")' : (tableId ? 'game.tables.get("' + esc(tableId) + '")' : 'null')
          lines.push(indent + 'const table = ' + tableRef)
          lines.push(indent + 'if (table) {')
          lines.push(indent + '  const rollResult = await table.roll()')
          lines.push(indent + '  const ' + dataVar(nodeId, 'result') + ' = rollResult?.results?.[0]?.text || ""')
          lines.push(indent + '}')

          break
        }
        case 'playSound': {
          const playlistName = d.playlistName || ''
          const soundName = d.soundName || ''
          lines.push(indent + '// Play Sound -> e.g. plays Thunderclap from Battle Themes playlist')
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

          break
        }
        case 'toggleScene': {
          const sceneRef = fieldVal('scene', '')
          const sceneName = d.sceneName || ''
          lines.push(indent + '// Toggle Scene: ' + sceneName + ' -> e.g. activates The Dark Forest')
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

          break
        }
        // Data source nodes (produce variables)
        case 'searchActors': {
          const query = d.actorQuery || ''
          lines.push(indent + '// Search Actors: ' + query + " -> e.g. finds Gandalf actor by name")
          lines.push(indent + 'const ' + dataVar(nodeId, 'actor') + ' = ' + (query
            ? 'game.actors.getName("' + esc(query) + '") || canvas.tokens.placeables.find(t => t.name === "' + esc(query) + '")?.actor'
            : 'game.user.targets.first()?.actor'))

          break
        }
        case 'searchTargets': {
          lines.push(indent + '// Search Targets -> e.g. gets first targeted token on canvas')
          lines.push(indent + 'const ' + dataVar(nodeId, 'target') + ' = game.user.targets.first() || token')

          break
        }
        case 'searchScenes': {
          const sName = d.sceneName || ''
          lines.push(indent + '// Search Scenes: ' + sName + ' -> e.g. finds The Dark Forest scene')
          if (sName) {
            lines.push(indent + 'const ' + dataVar(nodeId, 'scene') + ' = game.scenes.getName("' + esc(sName) + '") || game.scenes.get("' + esc(sName) + '")')
          } else {
            lines.push(indent + 'const ' + dataVar(nodeId, 'scene') + ' = canvas.scene')
          }

          break
        }
        case 'getActorHP': {
          lines.push(indent + '// Get Actor HP -> e.g. returns hp: 42, maxHp: 50, tempHp: 5')
          lines.push(indent + 'const hpActor = token?.actor')
          lines.push(indent + 'if (hpActor) {')
          lines.push(indent + '  const hpData = hpActor.system.attributes.hp')
          lines.push(indent + '  const ' + dataVar(nodeId, 'hp') + ' = hpData.value')
          lines.push(indent + '  const ' + dataVar(nodeId, 'maxHp') + ' = hpData.max')
          lines.push(indent + '  const ' + dataVar(nodeId, 'tempHp') + ' = hpData.temp || 0')
          lines.push(indent + '}')

          break
        }
        default: {
          lines.push(indent + '// Unknown node: ' + d.label + ' (' + d.type + ')')

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

    // Topological sort: ensure data producers come before their consumers
    const dataDeps = new Map<string, Set<string>>()
    for (const n of nodes) {
      dataDeps.set(n.id, new Set())
    }
    for (const e of edges) {
      if (e.sourceHandle?.startsWith('data-out-') && e.targetHandle?.startsWith('data-in-')) {
        dataDeps.get(e.target)?.add(e.source)
      }
    }

    function topologicalSort(nodeIds: string[]): string[] {
      const inDegree = new Map<string, number>()
      const graph = new Map<string, string[]>()
      for (const id of nodeIds) {
        inDegree.set(id, 0)
        graph.set(id, [])
      }
      for (const [consumer, producers] of dataDeps) {
        if (!nodeIds.includes(consumer)) continue
        for (const producer of producers) {
          if (!nodeIds.includes(producer)) continue
          graph.get(producer)?.push(consumer)
          inDegree.set(consumer, (inDegree.get(consumer) || 0) + 1)
        }
      }
      const queue: string[] = []
      for (const [id, deg] of inDegree) {
        if (deg === 0) queue.push(id)
      }
      const result: string[] = []
      while (queue.length > 0) {
        const node = queue.shift()!
        result.push(node)
        for (const neighbor of graph.get(node) || []) {
          const newDeg = (inDegree.get(neighbor) || 1) - 1
          inDegree.set(neighbor, newDeg)
          if (newDeg === 0) queue.push(neighbor)
        }
      }
      for (const id of nodeIds) {
        if (!result.includes(id)) result.push(id)
      }
      return result
    }

    // Collect all reachable nodes in execution order
    const execOrder: string[] = []
    const execVisited = new Set<string>()

    function collectExecOrder(nodeId: string): void {
      if (execVisited.has(nodeId)) return
      execVisited.add(nodeId)
      execOrder.push(nodeId)
      for (const edge of execEdgeMap.get(nodeId) || []) {
        if (!edge.handle || edge.handle === 'exec-out') {
          collectExecOrder(edge.target)
        }
      }
    }

    for (const rootId of roots) {
      collectExecOrder(rootId)
    }

    if (roots.length === 0) {
      for (const nid of allNonHeader) {
        if (!execVisited.has(nid)) {
          collectExecOrder(nid)
        }
      }
    }

    // Add data-producing nodes that feed into visited nodes but weren't in exec flow
    for (const e of edges) {
      if (e.sourceHandle?.startsWith('data-out-') && e.targetHandle?.startsWith('data-in-')) {
        if (execVisited.has(e.target) && !execVisited.has(e.source)) {
          collectExecOrder(e.source)
        }
      }
    }

    // Topologically sort: data producers come before their consumers
    const sorted = topologicalSort(execOrder)

    // Generate code in sorted order
    for (const nodeId of sorted) {
      generateNodeLines(nodeId, lines, 0)
    }

    lines.push('}')
    lines.push('executeMacro()')
    const code = lines.join('\n')
    onCodeGenerated(code)
    // Also store the full command with node graph embedded
    const fullCommand = nodes.length > 0
      ? `// __NODE_GRAPH_V2__\n// ${JSON.stringify({ nodes, edges })}\n// __END_NODE_GRAPH__\n${code}`
      : code
    ;(window as any).__nodeEditor_fullCommand = fullCommand
    toast.success('Code generated from node graph')
    return fullCommand
  }, [nodes, edges, macroName, onCodeGenerated])

  const selectedNodeData = selectedNode
    ? nodes.find((n) => n.id === selectedNode)?.data ?? null
    : null
  // Expose exportCode so parent can call it before save
  useEffect(() => {
    ;(window as any).__nodeEditor_export = exportCode
    return () => { delete (window as any).__nodeEditor_export }
  }, [exportCode])
  
  // Notify parent of node graph changes
  const prevNodeCount = useRef(0)
  useEffect(() => {
    if (onNodeGraphChange && nodes.length !== prevNodeCount.current) {
      prevNodeCount.current = nodes.length
      onNodeGraphChange(nodes, edges)
    }
  }, [nodes, edges, onNodeGraphChange])
  
  // ─── Field labels for properties panel ───────────────────
  const fieldLabels: Record<string, string> = {
    formula: 'Formula',
    flavor: 'Flavor Text',
    content: 'Message',
    mode: 'Mode',
    effectName: 'Effect Name',
    target: 'Target Override',
    amount: 'Amount',
    condition: 'Expression',
    compareField: 'Field to Check',
    compareValue: 'Equals',
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

  // Node-type-specific field label overrides
  const nodeFieldLabels: Record<string, Record<string, string>> = {
    dealDamage: { amount: 'Damage Amount', target: 'Target Override' },
    healTarget: { amount: 'Heal Amount', target: 'Target Override' },
    applyEffect: { amount: 'Duration (seconds)', target: 'Target Override' },
    condition: { condition: 'Expression (type or pipe data)', compareField: 'Field to Check', compareValue: 'Equals' },
    sendChat: { content: 'Message (or connect data)' },
    concentrationSave: { damageAmount: 'Damage (or connect data)' },
  }

  const fieldPlaceholders: Record<string, string> = {
    formula: 'e.g. 1d20+5 → 17',
    flavor: 'e.g. "Sneak Attack!"',
    content: 'e.g. "The goblin collapses!"',
    mode: 'OOC or IC',
    effectName: 'e.g. Burning, Poisoned, Bless',
    target: 'token, @token-uuid, or Actor name',
    amount: 'e.g. 60 (seconds), or connect data pipe',
    condition: 'e.g. roll > 10, 1d20+5 >= 15',
    compareField: 'e.g. name, type, hp, level',
    compareValue: 'e.g. Gandalf or 42',
    trueLabel: 'True',
    falseLabel: 'False',
    name: 'myVar',
    value: '42 or "hello" or rollResult',
    macroName: '"Healing Word" or "Fireball"',
    macroUuid: 'Macro UUID from palette',
    ability: 'str, dex, con, int, wis, cha',
    skill: 'prc, inv, ath, acr, ste, ...',
    tableName: 'e.g. "Treasure Horde"',
    tableId: 'Optional UUID if name fails',
    playlistName: 'e.g. "Battle Themes"',
    soundName: 'e.g. "Thunderclap"',
    sceneName: 'e.g. "The Dark Forest"',
    sceneId: 'Optional UUID if name fails',
    statusId: 'poisoned, blinded, prone, etc.',
    damageAmount: 'e.g. 14 (damage taken this turn)',
    effectFile: 'modules/jb2a_pack/.../spell_blast.webm',
    soundFile: 'modules/.../sound.ogg',
    itemName: 'e.g. "Longsword +1"',
    targetName: 'e.g. "Goblin Archer"',
    tileName: 'e.g. "Spike Trap"',
    elevation: '1 → ground, 2 → first floor',
    rangeBottom: '0 = ground level',
    rangeTop: '5 = ceiling height',
    wallName: 'Wall ID or compass: N/S/E/W',
    actorQuery: 'e.g. "Gandalf" or "Goblin #3"',
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
          edgeTypes={edgeTypes}
          onNodeClick={(_, node) => setSelectedNode(node.id)}
          onNodeDoubleClick={(_, node) => setSelectedNodeDetailsDialog(node)}
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
          <>
            <div className="absolute bottom-4 left-4 right-4 bg-card border rounded-lg shadow-lg p-4 max-w-md z-10">
              <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                {selectedNodeData.label}
                <span className="text-[10px] text-muted-foreground font-normal">Properties</span>
              </div>
              <div className="space-y-3">
                {(() => {
                  // Determine fields for this node
                  const modId = String(selectedNodeData.moduleId || '')
                  let fieldDefs: NodeFieldDef[]

                  if (modId) {
                    // Module-mapped nodes: get fields from module mapping
                    const mapping = getModuleMapping(modId)
                    const nodeDef = mapping?.nodes.find((n) => n.type === selectedNodeData.type)
                    if (mapping && nodeDef) {
                      fieldDefs = getNodeFields(selectedNodeData.type, modId, nodeDef.properties.map((p) => ({
                        key: p.key,
                        label: p.label,
                        type: p.type,
                        options: p.options,
                      })))
                    } else {
                      fieldDefs = getNodeFields(selectedNodeData.type)
                    }
                  } else {
                    fieldDefs = getNodeFields(selectedNodeData.type)
                  }

                  // Sort by displayOrder, filter hidden
                  return fieldDefs
                    .filter((f) => !f.hideFromPanel)
                    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99))
                    .map((fieldDef) => {
                      const val = selectedNodeData[fieldDef.key] as string ?? ''
                      const rawExprCfg = selectedNodeData[`_exprConfig_${fieldDef.key}`] as string | undefined
                      const hasExpressionCfg = !!rawExprCfg
                      let initialExprConfig: ExpressionConfig | undefined
                      if (rawExprCfg) {
                        try { initialExprConfig = JSON.parse(rawExprCfg) } catch {}
                      }

                      return (
                        <div key={fieldDef.key}>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">{fieldDef.label}</Label>
                            {fieldDef.expressionAllowed && (
                              <button
                                onClick={() => {
                                  setExprEditorFieldKey(fieldDef.key)
                                  setExprEditorOpen(true)
                                }}
                                className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded transition-colors flex items-center gap-0.5',
                                  hasExpressionCfg
                                    ? 'bg-cyan-900/40 text-cyan-300 hover:bg-cyan-900/60'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                )}
                                title="Open Expression Editor"
                              >
                                <Code className="h-2.5 w-2.5" />
                                fx
                              </button>
                            )}
                          </div>
                          {fieldDef.type === 'select' ? (
                            <Select
                              value={String(val ?? '')}
                              onValueChange={(v) => updateNodeData(selectedNode!, fieldDef.key, v ?? '')}
                            >
                              <SelectTrigger className="h-8 text-xs mt-0.5">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(fieldDef.selectOptions ?? []).map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="relative">
                              <Input
                                className={cn(
                                  'h-8 text-xs mt-0.5 pr-8',
                                  hasExpressionCfg && 'border-cyan-500/40 bg-cyan-950/20'
                                )}
                                value={String(val ?? '')}
                                onChange={(e) => updateNodeData(selectedNode!, fieldDef.key, e.target.value)}
                                placeholder={
                                  hasExpressionCfg
                                    ? 'Expression configured — click fx to edit'
                                    : (fieldDef.placeholder || `Enter ${fieldDef.key}...`)
                                }
                              />
                              {hasExpressionCfg && (
                                <button
                                  onClick={() => {
                                    updateNodeData(selectedNode!, `_exprConfig_${fieldDef.key}`, '')
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-0.5 text-[9px] text-muted-foreground hover:text-foreground"
                                  title="Clear expression config"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                })()}
              </div>
            </div>

            {/* Expression Editor Modal — rendered at z-20 to overlay properly */}
            <div className="fixed inset-0 z-50 pointer-events-none">
              <div className="pointer-events-auto">
                <ExpressionEditor
                  open={exprEditorOpen}
                  onOpenChange={setExprEditorOpen}
                  onSave={(config) => {
                    if (selectedNode && exprEditorFieldKey) {
                      updateNodeData(selectedNode, `_exprConfig_${exprEditorFieldKey}`, JSON.stringify(config))
                    }
                  }}
                  fieldLabel={exprEditorFieldKey || 'Field'}
                  fieldDataType="object"
                  initialConfig={selectedNode && exprEditorFieldKey ? (() => {
                    const raw = selectedNodeData[`_exprConfig_${exprEditorFieldKey}`] as string | undefined
                    if (raw) try { return JSON.parse(raw) } catch {}
                    return undefined
                  })() : undefined}
                  allNodes={nodes}
                  allEdges={edges}
                  currentNodeId={selectedNode!}
                />
              </div>
            </div>
          </>
        )}

        {/* Node Details Dialog (double-click) */}
        <Dialog open={!!detailsDialogNode} onOpenChange={(open) => { if (!open) setDetailsDialogNode(null) }}>
          {detailsDialogNode && (() => {
            const nd = detailsDialogNode.data
            const schema = getNodeSchema(nd.type)
            const dataPorts = NODE_DATA_PORTS[nd.type] || []
            const outputPorts = dataPorts.filter((p) => p.type === 'output')
            const inputPorts = dataPorts.filter((p) => p.type === 'input')
            const example = schema?.example
            return (
              <div className="p-4 max-h-[70vh] overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold">{nd.label}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{nd.type}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{nd.description}</p>

                {/* Ports */}
                {dataPorts.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {inputPorts.length > 0 && (
                      <div>
                        <div className="text-[10px] font-medium text-muted-foreground mb-1">Inputs (left handles):</div>
                        {inputPorts.map((p) => (
                          <div key={p.id} className="text-[10px] flex items-center gap-2 ml-2">
                            <span className="size-1.5 rounded-full inline-block bg-cyan-500" />
                            <span className="font-medium">{p.label}</span>
                            <span className="text-muted-foreground/50">: {p.dataType}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {outputPorts.length > 0 && (
                      <div>
                        <div className="text-[10px] font-medium text-muted-foreground mb-1">Outputs (right handles):</div>
                        {outputPorts.map((p) => {
                          const portSchema = schema?.outputs?.find((s) => s.portId === p.id)
                          const fields = portSchema?.fields?.filter((f) => f.key !== '')
                          return (
                            <div key={p.id} className="ml-2 mb-1">
                              <div className="text-[10px] flex items-center gap-2">
                                <span className="size-1.5 rounded-full inline-block bg-emerald-500" />
                                <span className="font-medium">{p.label}</span>
                                <span className="text-muted-foreground/50">: {p.dataType}</span>
                              </div>
                              {fields && fields.length > 0 && (
                                <div className="ml-4 mt-0.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
                                  {fields.map((f) => (
                                    <div key={f.key} className="text-[9px] text-muted-foreground flex items-center gap-1">
                                      <span>{f.label}</span>
                                      <span className="text-[8px] text-muted-foreground/40">({f.type})</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Default config values */}
                {(() => {
                  const fieldDefs = getNodeFields(nd.type)
                  const configurable = fieldDefs.filter((f) => !f.hideFromPanel)
                  if (configurable.length === 0) return null
                  return (
                    <div className="mb-3">
                      <div className="text-[10px] font-medium text-muted-foreground mb-1">Fields:</div>
                      {configurable.map((f) => {
                        const val = nd[f.key] as string | undefined
                        return (
                          <div key={f.key} className="text-[10px] flex items-center gap-2 ml-2">
                            <span className="font-medium">{f.label}:</span>
                            <code className="text-[9px] bg-muted px-1 rounded">{val || '(empty)'}</code>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                {/* Example data */}
                {example && (
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground mb-1">Example output:</div>
                    <pre className="text-[9px] bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(example, null, 2)}</pre>
                  </div>
                )}
              </div>
            )
          })()}
        </Dialog>
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

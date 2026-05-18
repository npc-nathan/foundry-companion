'use client';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Code,
  Trash2,
  GripVertical,
  Loader2,
  ChevronDown,
  ChevronRight,
  Blocks,
  Puzzle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { relay } from '@/lib/relay';
import { getModuleNodeDefinitions, getModuleNodeDefinition } from '@/lib/module-mappings';
import {
  ExpressionEditor,
  expressionConfigToCode,
  type ExpressionConfig,
} from '@/components/macros/expression-editor';
import { edgeTypes } from '@/components/macros/data-edge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Dialog } from '@/components/ui/dialog';
import {
  NODE_DEFINITIONS,
  getNodeDefinition,
  getNodeFields,
  getNodeSchema,
  type FieldDefinition,
  type NodeCategory,
  type CodeGenContext,
  type PaletteItem,
} from '@/lib/node-definitions';

// ─── Types ──────────────────────────────────────────────────

interface CustomNodeData {
  type: string;
  label: string;
  category: NodeCategory;
  description: string;
  // roll dice
  formula?: string;
  flavor?: string;
  // send chat
  content?: string;
  mode?: string;
  // apply effect
  effectName?: string;
  // condition
  condition?: string;
  compareField?: string;
  compareValue?: string;
  // variable
  name?: string;
  value?: string;
  // run macro
  macroName?: string;
  macroUuid?: string;
  // deal damage / heal
  target?: string;
  amount?: string;
  // ability / skill check
  ability?: string;
  skill?: string;
  // toggle scene
  sceneName?: string;
  sceneId?: string;
  // roll table
  tableName?: string;
  tableId?: string;
  // play sound
  playlistName?: string;
  playlistId?: string;
  soundName?: string;
  // apply status
  statusId?: string;
  // concentration save
  damageAmount?: string;
  // death save
  // search actor
  actorQuery?: string;
  // module-specific
  moduleId?: string;
  moduleVersion?: string;
  [key: string]: unknown;
}

type MacroNode = Node<CustomNodeData>;
type MacroEdge = Edge;

interface RemoteMacro {
  uuid: string;
  id: string;
  name: string;
  type: string;
  command: string;
  scope: string;
  img?: string;
}

interface InstalledModule {
  id: string;
  title: string;
  active: boolean;
  version: string;
  description?: string;
  authors?: string;
}

// ─── Node Component ─────────────────────────────────────────

const categoryColors: Record<NodeCategory, string> = {
  action: 'border-l-blue-500',
  logic: 'border-l-amber-500',
  data: 'border-l-green-500',
  macro: 'border-l-purple-500',
  module: 'border-l-pink-500',
};

function MacroNodeComponent({ data, selected }: { data: CustomNodeData; selected: boolean }) {
  const isCondition = data.type === 'condition';
  const def = getNodeDefinition(data.type) || getModuleNodeDefinition(data.type);
  const dataPorts = def?.ports || [];

  const dataTypeColor: Record<string, string> = {
    any: '!border-cyan-400 !bg-cyan-900/60',
    number: '!border-blue-400 !bg-blue-900/60',
    string: '!border-yellow-400 !bg-yellow-900/60',
    actor: '!border-emerald-400 !bg-emerald-900/60',
    token: '!border-rose-400 !bg-rose-900/60',
    scene: '!border-teal-400 !bg-teal-900/60',
    boolean: '!border-purple-400 !bg-purple-900/60',
  };

  return (
    <Card
      className={cn(
        'min-w-[160px] px-3 py-2 shadow-md border-l-4 relative',
        categoryColors[data.category] || 'border-l-blue-500',
        selected && 'ring-2 ring-primary',
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
          const schema = getNodeSchema(data.type);
          const portSchema = schema?.outputs?.find((p) => p.portId === port.id);
          const fields = portSchema?.fields;
          const example = schema?.example?.[port.id];

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
          );
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
          const schema = getNodeSchema(data.type);
          const portSchema = schema?.outputs?.find((p) => p.portId === port.id);
          const fields = portSchema?.fields;
          const example = schema?.example?.[port.id];

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
                    <code className="text-[9px] bg-muted px-1 rounded">
                      {typeof example === 'object' ? JSON.stringify(example) : String(example)}
                    </code>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          );
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
          <div
            className="absolute text-[9px] font-bold text-green-400"
            style={{ bottom: -16, left: '37%' }}
          >
            ✓
          </div>
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!w-3 !h-3 !border-2 !bg-red-600 !border-red-300"
            style={{ left: '60%' }}
          />
          <div
            className="absolute text-[9px] font-bold text-red-400"
            style={{ bottom: -16, left: '57%' }}
          >
            ✗
          </div>
        </>
      )}
    </Card>
  );
}
const nodeTypes = {
  macroNode: MacroNodeComponent,
};

// ─── Props ──────────────────────────────────────────────────

interface Props {
  currentCode: string;
  onCodeGenerated: (code: string) => void;
  macroName: string;
  macroType: string;
  macroScope: string;
  isNew?: boolean;
  currentMacroId?: string | null;
  onMacroFieldChange?: (field: string, value: string) => void;
  onSave?: () => void;
  onRun?: () => void;
  onDelete?: () => void;
  isSaving?: boolean;
  isRunning?: boolean;
  isDeleting?: boolean;
  initialNodes?: unknown[] | null;
  initialEdges?: unknown[] | null;
  onNodeGraphChange?: (nodes: unknown[], edges: unknown[]) => void;
}

// ─── Canvas Component ───────────────────────────────────────

function FlowCanvas({
  onCodeGenerated,
  macroName,
  initialNodes,
  initialEdges,
  onNodeGraphChange,
}: Props) {
  const reactFlowInstance = useReactFlow<Node<CustomNodeData>>();
  const [nodes, setNodes, onNodesChange] = useNodesState<MacroNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<MacroEdge>([]);
  // Load initial node graph from props when they change (new macro selected or data reloaded)
  useEffect(() => {
    if (initialNodes && initialEdges && initialNodes.length > 0) {
      setNodes(initialNodes as MacroNode[]);
      setEdges(initialEdges as MacroEdge[]);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [remoteMacros, setRemoteMacros] = useState<RemoteMacro[]>([]);
  const [installedModules, setInstalledModules] = useState<InstalledModule[]>([]);
  const [loadingMacros, setLoadingMacros] = useState(true);
  const [loadingModules, setLoadingModules] = useState(true);
  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({});
  // Cache for dynamic property options
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- value is written but read by module node rendering downstream
  const [dynamicOptions, setDynamicOptions] = useState<
    Record<string, { value: string; label: string }[]>
  >({});
  // Expression editor state
  const [exprEditorOpen, setExprEditorOpen] = useState(false);
  const [exprEditorFieldKey, setExprEditorFieldKey] = useState<string | null>(null);
  // Node details dialog (double-click)
  const [detailsDialogNode, setDetailsDialogNode] = useState<MacroNode | null>(null);

  // ─── Fetch macros from relay ────────────────────────────
  useEffect(() => {
    let mounted = true;
    relay
      .getMacros()
      .then((data) => {
        if (!mounted) return;
        const raw: unknown[] =
          data && 'macros' in (data as object)
            ? ((data as Record<string, unknown>).macros as unknown[])
            : data && 'data' in (data as object)
              ? ((data as Record<string, unknown>).data as unknown[])
              : Array.isArray(data)
                ? data
                : [];
        const macros: RemoteMacro[] = raw
          .map((m) => {
            const r = m as Record<string, unknown>;
            return {
              uuid: (r.uuid as string) || (r._id as string) || '',
              id: (r.id as string) || '',
              name: (r.name as string) || '',
              type: (r.type as string) || 'script',
              command: (r.command as string) || '',
              scope: (r.scope as string) || 'global',
              img: r.img as string | undefined,
            };
          })
          .filter((m) => m.uuid);
        setRemoteMacros(macros);
        setLoadingMacros(false);
      })
      .catch(() => {
        if (mounted) {
          setRemoteMacros([]);
          setLoadingMacros(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // ─── Fetch modules from relay ───────────────────────────
  useEffect(() => {
    let mounted = true;
    relay
      .worldInfo()
      .then((data) => {
        if (!mounted) return;
        const payload = (
          data && 'data' in (data as object) ? (data as Record<string, unknown>).data : data
        ) as Record<string, unknown> | null;
        const rawModules = payload?.modules as InstalledModule[] | undefined;
        const active = rawModules?.filter((m) => m.active) ?? [];
        setInstalledModules(active);

        // Build dynamic property options from known modules
        const opts: Record<string, { value: string; label: string }[]> = {};
        for (const mod of active) {
          const moduleDefs = getModuleNodeDefinitions(mod.id);
          for (const nodeDef of moduleDefs) {
            for (const field of nodeDef.fields) {
              if (field.selectOptions && field.selectOptions.length > 0) {
                opts[`${mod.id}:${nodeDef.type}:${field.key}`] = field.selectOptions;
              }
            }
          }
        }
        setDynamicOptions(opts);
        setLoadingModules(false);
      })
      .catch(() => {
        if (mounted) {
          setInstalledModules([]);
          setLoadingModules(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // ─── Build palette sections ─────────────────────────────
  const paletteSections = useMemo(() => {
    const sections: {
      title: string;
      icon?: React.ReactNode;
      items: {
        type: string;
        label: string;
        category: NodeCategory;
        description: string;
        icon?: React.ReactNode;
        defaultData: Record<string, unknown>;
      }[];
    }[] = [
      {
        title: 'Actions',
        items: NODE_DEFINITIONS.filter((i) => i.category === 'action'),
      },
      {
        title: 'Logic',
        items: NODE_DEFINITIONS.filter((i) => i.category === 'logic'),
      },
      {
        title: 'Data',
        items: NODE_DEFINITIONS.filter((i) => i.category === 'data'),
      },
    ];

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
              category: 'macro' as NodeCategory,
              description: `Run "${m.name}"`,
              defaultData: {
                macroName: m.name,
                macroUuid: m.uuid,
                description: `Execute: ${m.name}`,
              },
            }) as {
              type: string;
              label: string;
              category: NodeCategory;
              description: string;
              defaultData: Record<string, unknown>;
            },
        ),
      });
    }

    // Foundry Modules section (using module-mappings)
    const activeModules = installedModules.filter((m) => m.active);
    if (activeModules.length > 0) {
      const moduleItems: PaletteItem[] = [];

      for (const mod of activeModules) {
        const moduleDefs = getModuleNodeDefinitions(mod.id);

        if (moduleDefs.length > 0) {
          // Group header: module title
          moduleItems.push({
            type: `_section_${mod.id}`,
            label: mod.title,
            category: 'module',
            description: mod.description || moduleDefs[0]?.description || mod.id,
            icon: <Puzzle className="h-3 w-3 text-pink-400" />,
            defaultData: { moduleId: mod.id },
          });

          // Individual nodes from the module definitions
          for (const def of moduleDefs) {
            moduleItems.push({
              type: def.type,
              label: def.label,
              category: 'module',
              description: `${def.description} (${mod.title})`,
              icon: <Puzzle className="h-3 w-3 text-pink-400" />,
              defaultData: {
                moduleId: mod.id,
                ...def.defaultData,
              },
            });
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
          });
        }
      }

      if (moduleItems.length > 0) {
        sections.push({
          title: `Foundry Modules (${activeModules.length})`,
          icon: <Puzzle className="h-3 w-3 text-pink-500" />,
          items: moduleItems,
        });
      }
    }

    return sections;
  }, [remoteMacros, installedModules]);

  const toggleSection = (title: string) => {
    setSectionsCollapsed((prev) => ({
      ...prev,
      // eslint-disable-next-line security/detect-object-injection -- title is part of controlled palette sections
      [title]: !prev[title],
    }));
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      // Detect data connections (left/right handles) vs execution (top/bottom handles)
      const isDataConnection =
        (connection.sourceHandle?.startsWith('data-out-') ?? false) &&
        (connection.targetHandle?.startsWith('data-in-') ?? false);
      const isExecutionConnection =
        (connection.sourceHandle === 'exec-out' ||
          connection.sourceHandle === null ||
          connection.sourceHandle === undefined) &&
        (connection.targetHandle === 'exec-in' ||
          connection.targetHandle === null ||
          connection.targetHandle === undefined) &&
        !connection.sourceHandle?.startsWith('data-out-') &&
        !connection.targetHandle?.startsWith('data-in-');

      // Validate: don't mix data and execution handles
      if (!isDataConnection && !isExecutionConnection) return;

      // Extract dataType from the source port definition for edge labels
      let dataType = 'any';
      if (isDataConnection && connection.source) {
        const sourceNode = nodes.find((n) => n.id === connection.source);
        const portId = connection.sourceHandle?.replace('data-out-', '');
        if (sourceNode && portId) {
          const portDefs = (getNodeDefinition(sourceNode.data.type) || getModuleNodeDefinition(sourceNode.data.type))?.ports || [];
          const portDef = portDefs.find((p) => p.id === portId);
          if (portDef) dataType = portDef.dataType;
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
      };
      setEdges((eds) => [...eds, edge]);
    },
    [setEdges, nodes],
  );

  const addNodeToCanvas = useCallback(
    (item: PaletteItem) => {
      const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const pos = reactFlowInstance.screenToFlowPosition({
        x: window.innerWidth / 2 + Math.random() * 200 - 100,
        y: window.innerHeight / 2 + Math.random() * 200 - 100,
      }) || { x: 250, y: 150 };

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
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes],
  );

  const deleteSelected = useCallback(() => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode && e.target !== selectedNode));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  const setSelectedNodeDetailsDialog = useCallback((node: MacroNode) => {
    setDetailsDialogNode(node);
  }, []);

  const updateNodeData = useCallback(
    (nodeId: string, field: string, value: string) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n)),
      );
    },
    [setNodes],
  );

  // ─── Sanitize helpers ───────────────────────────────────
  const esc = (s: string) => s.replace(/"/g, '\\"');

  // ─── Export to Code ─────────────────────
  const exportCode = useCallback(() => {
    // edgeMap: execution flow edges (source → targets)
    const execEdgeMap = new Map<string, { target: string; handle: string | null | undefined }[]>();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    nodes.forEach((n) => execEdgeMap.set(n.id, []));
    edges
      .filter(
        (e) =>
          !e.sourceHandle ||
          e.sourceHandle.startsWith('exec-') ||
          (!e.sourceHandle && !e.targetHandle),
      )
      .forEach((e) => {
        execEdgeMap.get(e.source)?.push({ target: e.target, handle: e.sourceHandle });
      });

    // dataInMap: incoming data connections to each node's input ports
    // key: "targetNodeId:portId" → { sourceNodeId, sourcePortId }
    const dataInMap = new Map<string, { sourceNodeId: string; sourcePortId: string }>();
    for (const e of edges) {
      if (!e.sourceHandle?.startsWith('data-out-') || !e.targetHandle?.startsWith('data-in-'))
        continue;
      const sourcePortId = e.sourceHandle.replace('data-out-', '');
      const targetPortId = e.targetHandle.replace('data-in-', '');
      dataInMap.set(`${e.target}:${targetPortId}`, { sourceNodeId: e.source, sourcePortId });
    }

    // dataOutVar: variable names for output ports
    // convention: _d_{nodeId}_{portId} — e.g. _d_node-abc_result
    function dataVar(nodeId: string, portId: string): string {
      return `_d_${nodeId.replace(/[^a-zA-Z0-9]/g, '_')}_${portId}`;
    }

    // Get the source node's data output variable for a target's input port
    function dataForInput(nodeId: string, fieldKey: string): string | null {
      const entry = dataInMap.get(`${nodeId}:${fieldKey}`);
      if (!entry) return null;
      const sourceDef = getNodeDefinition(nodeMap.get(entry.sourceNodeId)?.data?.type || '') ||
        getModuleNodeDefinition(nodeMap.get(entry.sourceNodeId)?.data?.type || '');
      const sourcePortDef = (sourceDef?.ports || []).find((p) => p.id === entry.sourcePortId);
      if (!sourcePortDef) return null;
      return dataVar(entry.sourceNodeId, entry.sourcePortId);
    }

    const generatedNodes = new Set<string>();

    function generateNodeLines(nodeId: string, lines: string[], depth = 0): void {
      if (generatedNodes.has(nodeId)) return;
      generatedNodes.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (!node) return;

      const d = node.data;
      const indent = '  '.repeat(depth);

      if ((d.type as string).startsWith('_')) return;

      // Helper: check if a field value should come from a data pipe
      function fieldVal(fieldKey: string, fallback: string): string {
        const pipeVar = dataForInput(nodeId, fieldKey);
        if (pipeVar) return pipeVar;
        const key = fieldKey as keyof typeof d;
        // eslint-disable-next-line security/detect-object-injection -- d is node.data, key is validated via fieldKey from schema
        const nodeVal = String(d[key] ?? '');
        return nodeVal || fallback;
      }

      // All node types — built-in via NODE_DEFINITIONS, module via MODULE_NODE_DEFINITIONS
      if (d.type === 'condition') {
        // Condition: special handler because it needs execEdgeMap for true/false branching
        const rawExprCfg = String(d._exprConfig_condition || '');
        let exprCode: string | null = null;
        if (rawExprCfg) {
          try {
            const parsedConfig: unknown = JSON.parse(rawExprCfg);
            exprCode = expressionConfigToCode(
              parsedConfig as ExpressionConfig,
              nodeId,
              nodes.map((n) => ({
                id: n.id,
                data: n.data as unknown as Record<string, unknown>,
              })),
            );
          } catch { /* ignore parse errors */ }
        }
        if (exprCode) {
          lines.push(indent + '// Condition -> Expression Builder: ' + exprCode);
          lines.push(indent + 'if (' + exprCode + ') {');
        } else {
          const pipedVar = dataForInput(nodeId, 'condition');
          const cond = pipedVar || fieldVal('condition', String(d.condition || 'true'));
          lines.push(indent + '// Condition -> e.g. if (rollTotal > 10) { ... } else { ... }');
          lines.push(indent + 'if (' + cond + ') {');
        }
        const trueEdges = (execEdgeMap.get(nodeId) || []).filter((e) => e.handle === 'true');
        for (const te of trueEdges) {
          generateNodeLines(te.target, lines, depth + 1);
        }
        const falseEdges = (execEdgeMap.get(nodeId) || []).filter((e) => e.handle === 'false');
        if (falseEdges.length > 0) {
          lines.push(indent + '} else {');
          for (const fe of falseEdges) {
            generateNodeLines(fe.target, lines, depth + 1);
          }
        }
        lines.push(indent + '}');
      } else {
        // All other node types: check built-in registry first, then module definitions
        const def = getNodeDefinition(d.type as string) || getModuleNodeDefinition(d.type as string);
        if (def?.codeGen) {
          const ctx: CodeGenContext = {
            nodeId,
            d,
            indent,
            fieldVal: (fieldKey, fallback) => fieldVal(fieldKey, fallback),
            dataVar: (portId) => dataVar(nodeId, portId),
            dataForInput: (fieldKey) => dataForInput(nodeId, fieldKey),
            esc: (s) => esc(s),
          };
          const codeLines = def.codeGen(ctx);
          for (const cl of codeLines) {
            lines.push(cl);
          }
        } else {
          lines.push(indent + '// Unknown node: ' + d.label + ' (' + d.type + ')');
        }
      }
    }

    const lines: string[] = [];
    lines.push('// Generated from node graph: ' + (macroName || 'Untitled Macro'));
    lines.push('');
    lines.push('async function executeMacro() {');

    // Smart token guard: scan graph to determine if/how token is needed
    const hasControlled = nodes.some((n) => {
      const nd = getNodeDefinition(n.data.type as string) || getModuleNodeDefinition(n.data.type as string);
      return nd?.actorSource === 'controlled';
    });
    const hasPipedToken = nodes.some((n) => {
      const nd = getNodeDefinition(n.data.type as string) || getModuleNodeDefinition(n.data.type as string);
      return nd?.actorSource === 'piped-token';
    });
    if (hasControlled) {
      lines.push('  const token = canvas.tokens.controlled[0]');
      lines.push('  if (!token) { ui.notifications.warn("Select a token first"); return }');
    } else if (hasPipedToken) {
      lines.push('  const token = canvas.tokens.controlled[0]');
    }

    const hasIncoming = new Set<string>();
    edges.forEach((e) => {
      // Only count execution edges for root detection
      if (
        !e.sourceHandle ||
        e.sourceHandle.startsWith('exec-') ||
        (!e.sourceHandle && !e.targetHandle)
      ) {
        hasIncoming.add(e.target);
      }
    });
    const roots = nodes
      .filter((n) => !hasIncoming.has(n.id) && !(n.data.type as string).startsWith('_'))
      .map((n) => n.id);

    const allNonHeader = nodes
      .filter((n) => !(n.data.type as string).startsWith('_'))
      .map((n) => n.id);

    // Topological sort: ensure data producers come before their consumers
    const dataDeps = new Map<string, Set<string>>();
    for (const n of nodes) {
      dataDeps.set(n.id, new Set());
    }
    for (const e of edges) {
      if (e.sourceHandle?.startsWith('data-out-') && e.targetHandle?.startsWith('data-in-')) {
        dataDeps.get(e.target)?.add(e.source);
      }
    }

    function topologicalSort(nodeIds: string[]): string[] {
      const inDegree = new Map<string, number>();
      const graph = new Map<string, string[]>();
      for (const id of nodeIds) {
        inDegree.set(id, 0);
        graph.set(id, []);
      }
      for (const [consumer, producers] of dataDeps) {
        if (!nodeIds.includes(consumer)) continue;
        for (const producer of producers) {
          if (!nodeIds.includes(producer)) continue;
          graph.get(producer)?.push(consumer);
          inDegree.set(consumer, (inDegree.get(consumer) || 0) + 1);
        }
      }
      const queue: string[] = [];
      for (const [id, deg] of inDegree) {
        if (deg === 0) queue.push(id);
      }
      const result: string[] = [];
      while (queue.length > 0) {
        const node = queue.shift()!;
        result.push(node);
        for (const neighbor of graph.get(node) || []) {
          const newDeg = (inDegree.get(neighbor) || 1) - 1;
          inDegree.set(neighbor, newDeg);
          if (newDeg === 0) queue.push(neighbor);
        }
      }
      for (const id of nodeIds) {
        if (!result.includes(id)) result.push(id);
      }
      return result;
    }

    // Collect all reachable nodes in execution order
    const execOrder: string[] = [];
    const execVisited = new Set<string>();

    function collectExecOrder(nodeId: string): void {
      if (execVisited.has(nodeId)) return;
      execVisited.add(nodeId);
      execOrder.push(nodeId);
      for (const edge of execEdgeMap.get(nodeId) || []) {
        if (!edge.handle || edge.handle === 'exec-out') {
          collectExecOrder(edge.target);
        }
      }
    }

    for (const rootId of roots) {
      collectExecOrder(rootId);
    }

    if (roots.length === 0) {
      for (const nid of allNonHeader) {
        if (!execVisited.has(nid)) {
          collectExecOrder(nid);
        }
      }
    }

    // Add data-producing nodes that feed into visited nodes but weren't in exec flow
    for (const e of edges) {
      if (e.sourceHandle?.startsWith('data-out-') && e.targetHandle?.startsWith('data-in-')) {
        if (execVisited.has(e.target) && !execVisited.has(e.source)) {
          collectExecOrder(e.source);
        }
      }
    }

    // Topologically sort: data producers come before their consumers
    const sorted = topologicalSort(execOrder);

    // Generate code in sorted order
    for (const nodeId of sorted) {
      generateNodeLines(nodeId, lines, 0);
    }

    lines.push('}');
    lines.push('executeMacro()');
    const code = lines.join('\n');
    onCodeGenerated(code);
    // Also store the full command with node graph embedded
    const fullCommand =
      nodes.length > 0
        ? `// __NODE_GRAPH_V2__\n// ${JSON.stringify({ nodes, edges })}\n// __END_NODE_GRAPH__\n${code}`
        : code;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cross-component via window
    (window as any).__nodeEditor_fullCommand = fullCommand;
    toast.success('Code generated from node graph');
    return fullCommand;
  }, [nodes, edges, macroName, onCodeGenerated]);

  const selectedNodeData = selectedNode
    ? (nodes.find((n) => n.id === selectedNode)?.data ?? null)
    : null;
  // Expose exportCode so parent can call it before save
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cross-component via window
    (window as any).__nodeEditor_export = exportCode;
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cross-component via window
      delete (window as any).__nodeEditor_export;
    };
  }, [exportCode]);

  // Notify parent of node graph changes
  const prevNodeCount = useRef(0);
  useEffect(() => {
    if (onNodeGraphChange && nodes.length !== prevNodeCount.current) {
      prevNodeCount.current = nodes.length;
      onNodeGraphChange(nodes, edges);
    }
  }, [nodes, edges, onNodeGraphChange]);

  return (
    <div className="flex h-full">
      {/* Palette sidebar */}
      <div className="w-56 shrink-0 border-r bg-muted/10 flex flex-col overflow-y-auto p-3">
        {paletteSections.map((section) => {
          const collapsed =
            sectionsCollapsed[section.title as keyof typeof sectionsCollapsed] ?? false;
          return (
            <div key={section.title} className="mb-3">
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full text-left mb-1.5 hover:text-foreground transition-colors"
              >
                {collapsed ? (
                  <ChevronRight className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
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
                    );
                  }

                  return (
                    <button
                      key={item.type + '-' + item.label}
                      onClick={() => addNodeToCanvas(item)}
                      className={cn(
                        'text-left px-2 py-1.5 rounded text-sm hover:bg-accent/50 transition-colors mb-0.5 w-full flex items-center gap-1.5',
                        item.category === 'macro' && 'text-purple-300 hover:text-purple-200',
                        item.category === 'module' && 'text-pink-300 hover:text-pink-200',
                        item.type === '_unknown_module_' && 'opacity-60 cursor-default',
                      )}
                      disabled={item.type === '_unknown_module_'}
                    >
                      {item.icon || null}
                      <span
                        className={cn(
                          'font-medium truncate',
                          item.type === '_unknown_module_' && 'text-muted-foreground',
                        )}
                      >
                        {item.label}
                      </span>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.type === '_unknown_module_'
                          ? 'No available actions'
                          : item.description}
                      </p>
                    </button>
                  );
                })}
            </div>
          );
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
          <Button
            size="sm"
            className="w-full gap-1"
            onClick={exportCode}
            disabled={nodes.length === 0}
          >
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
                  // Get field definitions from registry (built-in or module)
                  const fieldDefs: FieldDefinition[] = getNodeFields(selectedNodeData.type);

                  // Sort by displayOrder, filter hidden
                  return fieldDefs
                    .filter((f) => !f.hideFromPanel)
                    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99))
                    .map((fieldDef) => {
                      const val = (selectedNodeData[fieldDef.key] as string) ?? '';
                      const rawExprCfg = selectedNodeData[`_exprConfig_${fieldDef.key}`] as
                        | string
                        | undefined;
                      const hasExpressionCfg = !!rawExprCfg;

                      return (
                        <div key={fieldDef.key}>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">{fieldDef.label}</Label>
                            {fieldDef.expressionAllowed && (
                              <button
                                onClick={() => {
                                  setExprEditorFieldKey(fieldDef.key);
                                  setExprEditorOpen(true);
                                }}
                                className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded transition-colors flex items-center gap-0.5',
                                  hasExpressionCfg
                                    ? 'bg-cyan-900/40 text-cyan-300 hover:bg-cyan-900/60'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
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
                              onValueChange={(v) =>
                                updateNodeData(selectedNode!, fieldDef.key, v ?? '')
                              }
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
                                  hasExpressionCfg && 'border-cyan-500/40 bg-cyan-950/20',
                                )}
                                value={String(val ?? '')}
                                onChange={(e) =>
                                  updateNodeData(selectedNode!, fieldDef.key, e.target.value)
                                }
                                placeholder={
                                  hasExpressionCfg
                                    ? 'Expression configured — click fx to edit'
                                    : fieldDef.placeholder || `Enter ${fieldDef.key}...`
                                }
                              />
                              {hasExpressionCfg && (
                                <button
                                  onClick={() => {
                                    updateNodeData(
                                      selectedNode!,
                                      `_exprConfig_${fieldDef.key}`,
                                      '',
                                    );
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
                      );
                    });
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
                      updateNodeData(
                        selectedNode,
                        `_exprConfig_${exprEditorFieldKey}`,
                        JSON.stringify(config),
                      );
                    }
                  }}
                  fieldLabel={exprEditorFieldKey || 'Field'}
                  fieldDataType="object"
                  initialConfig={
                    selectedNode && exprEditorFieldKey
                      ? (() => {
                          const raw = selectedNodeData[`_exprConfig_${exprEditorFieldKey}`] as
                            | string
                            | undefined;
                          if (raw)
                            try {
                              return JSON.parse(raw);
                            } catch {}
                          return undefined;
                        })()
                      : undefined
                  }
                  allNodes={nodes}
                  allEdges={edges}
                  currentNodeId={selectedNode!}
                />
              </div>
            </div>
          </>
        )}

        {/* Node Details Dialog (double-click) */}
        <Dialog
          open={!!detailsDialogNode}
          onOpenChange={(open) => {
            if (!open) setDetailsDialogNode(null);
          }}
        >
          {detailsDialogNode &&
            (() => {
              const nd = detailsDialogNode.data;
              const def = getNodeDefinition(nd.type) || getModuleNodeDefinition(nd.type);
              const schema = getNodeSchema(nd.type);
              const dataPorts = def?.ports || [];
              const outputPorts = dataPorts.filter((p) => p.type === 'output');
              const inputPorts = dataPorts.filter((p) => p.type === 'input');
              const example = schema?.example;
              return (
                <div className="p-4 max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-semibold">{nd.label}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {nd.type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{nd.description}</p>

                  {/* Ports */}
                  {dataPorts.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {inputPorts.length > 0 && (
                        <div>
                          <div className="text-[10px] font-medium text-muted-foreground mb-1">
                            Inputs (left handles):
                          </div>
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
                          <div className="text-[10px] font-medium text-muted-foreground mb-1">
                            Outputs (right handles):
                          </div>
                          {outputPorts.map((p) => {
                            const portSchema = schema?.outputs?.find((s) => s.portId === p.id);
                            const fields = portSchema?.fields?.filter((f) => f.key !== '');
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
                                      <div
                                        key={f.key}
                                        className="text-[9px] text-muted-foreground flex items-center gap-1"
                                      >
                                        <span>{f.label}</span>
                                        <span className="text-[8px] text-muted-foreground/40">
                                          ({f.type})
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Default config values */}
                  {(() => {
                    const fieldDefs = getNodeFields(nd.type);
                    const configurable = fieldDefs.filter((f) => !f.hideFromPanel);
                    if (configurable.length === 0) return null;
                    return (
                      <div className="mb-3">
                        <div className="text-[10px] font-medium text-muted-foreground mb-1">
                          Fields:
                        </div>
                        {configurable.map((f) => {
                          const val = nd[f.key] as string | undefined;
                          return (
                            <div key={f.key} className="text-[10px] flex items-center gap-2 ml-2">
                              <span className="font-medium">{f.label}:</span>
                              <code className="text-[9px] bg-muted px-1 rounded">
                                {val || '(empty)'}
                              </code>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Example data */}
                  {example && (
                    <div>
                      <div className="text-[10px] font-medium text-muted-foreground mb-1">
                        Example output:
                      </div>
                      <pre className="text-[9px] bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(example, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })()}
        </Dialog>
      </div>
    </div>
  );
}

// ─── Root Provider Wrapper ─────────────────────────────────

export default function NodeEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}

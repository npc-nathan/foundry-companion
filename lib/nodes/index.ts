// ─── Barrel Import: Re-exports everything from the nodes directory ──
// This is the single entry point — import { NODE_DEFINITIONS, getNodeDefinition, ... }
// from '@/lib/node-definitions' or from '@/lib/nodes' (both work).

import type { NodeCategory, NodeDefinition, FieldDefinition, FieldDefType } from './types';
import { getModuleNodeDefinition } from '@/lib/module-mappings';
import { ACTION_NODES } from './action-nodes';
import { DATA_NODES } from './data-nodes';
import { LOGIC_NODES } from './logic-nodes';
import { MACRO_NODES } from './macro-nodes';

// ─── Merged Registry ─────────────────────────────────────────────

export const NODE_DEFINITIONS: NodeDefinition[] = [
  ...ACTION_NODES,
  ...DATA_NODES,
  ...LOGIC_NODES,
  ...MACRO_NODES,
];

// ─── Helper Functions ────────────────────────────────────────────

const defMap = new Map(NODE_DEFINITIONS.map((d) => [d.type, d]));

export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return defMap.get(type);
}

export function getNodesByCategory(category: NodeCategory): NodeDefinition[] {
  return NODE_DEFINITIONS.filter((d) => d.category === category);
}

export function getNodeFields(
  nodeType: string,
  moduleId?: string,
  moduleNodeFields?: {
    key: string;
    label: string;
    type: string;
    options?: { value: string; label: string }[];
  }[],
): FieldDefinition[] {
  if (moduleId && moduleNodeFields) {
    return moduleNodeFields.map((f) => ({
      key: f.key,
      label: f.label,
      type: (f.type === 'select' || f.options ? 'select' : 'expression') as FieldDefType,
      selectOptions: f.options,
      expressionAllowed: f.type !== 'select',
      placeholder: 'Enter ' + f.label.toLowerCase() + '...',
    }));
  }
  const def = defMap.get(nodeType);
  if (def?.fields) return def.fields;
  // Check module node definitions if not found in built-in registry
  const modDef = getModuleNodeDefinition?.(nodeType);
  return modDef?.fields || [];
}

export function getNodeSchema(type: string):
  | {
      outputs: import('./types').OutputPortSchema[];
      example?: Record<string, unknown>;
    }
  | undefined {
  const def = defMap.get(type);
  if (!def) return undefined;
  return {
    outputs: def.outputSchema || [],
    example: def.example,
  };
}

export function getOutputPortsForType(type: string): import('./types').OutputPortSchema[] {
  return defMap.get(type)?.outputSchema || [];
}

export function getPortFields(nodeType: string, portId: string): import('./types').SchemaField[] {
  const def = defMap.get(nodeType);
  if (!def || !def.outputSchema) return [];
  const port = def.outputSchema.find((p) => p.portId === portId);
  return port?.fields || [];
}

export function getScalarPortField(
  nodeType: string,
  portId: string,
): import('./types').SchemaField | null {
  const fields = getPortFields(nodeType, portId);
  if (fields.length === 1 && fields[0].key === '') {
    return fields[0];
  }
  return null;
}

/**
 * Build the dynamic content tree for the Expression Editor.
 */
export function buildDynamicContentTree(
  nodes: Array<{ id: string; data: { type: string; label: string } }>,
  edges: Array<{ source: string; target: string; sourceHandle?: string | null }>,
  currentNodeId: string,
): Array<{
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  isConnected: boolean;
  ports: {
    portId: string;
    portLabel: string;
    portType: string;
    fields: import('./types').SchemaField[];
  }[];
}> {
  // Find all upstream nodes via transitive closure of edges
  const upstreamNodes = new Set<string>();
  function findUpstream(nodeId: string) {
    for (const edge of edges) {
      if (edge.target === nodeId) {
        if (!upstreamNodes.has(edge.source)) {
          upstreamNodes.add(edge.source);
          findUpstream(edge.source);
        }
      }
    }
  }
  findUpstream(currentNodeId);

  const result: Array<{
    nodeId: string;
    nodeType: string;
    nodeLabel: string;
    isConnected: boolean;
    ports: {
      portId: string;
      portLabel: string;
      portType: string;
      fields: import('./types').SchemaField[];
    }[];
  }> = [];

  for (const node of nodes) {
    if (node.id === currentNodeId) continue;
    const def = defMap.get(node.data.type);
    if (!def || !def.outputSchema) continue;

    const outputPorts = def.outputSchema.filter((p) => p.fields.length > 0);
    if (outputPorts.length === 0) continue;

    const isConnected = upstreamNodes.has(node.id);

    result.push({
      nodeId: node.id,
      nodeType: node.data.type,
      nodeLabel: node.data.label,
      isConnected,
      ports: outputPorts.map((p) => ({
        portId: p.portId,
        portLabel: p.portLabel,
        portType: p.portType,
        fields: p.fields,
      })),
    });
  }

  return result;
}

// ─── Re-export everything from types for convenience ────────────

export type {
  NodeCategory,
  ActorSource,
  NodeDefinition,
  PortDefinition,
  FieldDefinition,
  FieldDefType,
  SchemaFieldType,
  PaletteItem,
  SchemaField,
  OutputPortSchema,
  CodeGenContext,
  DynamicContentPort,
  DynamicContentNode,
} from './types';

export { safeJsKey } from './helpers';

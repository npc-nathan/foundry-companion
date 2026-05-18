// ─── Parse Macro Graph for Input Requirements ────────────
// When a `runMacro` node selects a child macro built with the node builder,
// we scan its embedded graph flag to discover what inputs it needs from the
// parent macro. These become dynamic data ports on the `runMacro` node.

export interface MacroInputPort {
  id: string;
  label: string;
  dataType: string;
  description: string;
}

/**
 * Extract the node graph JSON from a macro's command string.
 * Macros built with the companion embed their graph as:
 *   // __NODE_GRAPH_V2__
 *   // {"nodes":[...],"edges":[...]}
 *   // __END_NODE_GRAPH__
 */
export function extractNodeGraph(command: string): {
  nodes: Array<{ id: string; data: Record<string, unknown> }>;
  edges: Array<{ source: string; target: string; sourceHandle?: string; targetHandle?: string }>;
} | null {
  const match = command.match(/\/\/ __NODE_GRAPH_V2__\n\/\/ (.*)\n\/\/ __END_NODE_GRAPH__/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Data type mapping: what port data type to expose for each known boundary-node type.
 *
 * "Boundary nodes" are nodes that act as data origins or sinks within a macro graph:
 *   searchActors  → outputs an actor → expose as `actor` input
 *   searchTargets → outputs a token → expose as `token` input
 *   rollDice      → outputs a roll_object → expose as `roll` input
 */
const BOUNDARY_TYPE_MAP: Record<string, { label: string; dataType: string; description: string }> =
  {
    searchActors: {
      label: 'Actor',
      dataType: 'actor',
      description: 'Actor to search for (overrides child macro search)',
    },
    searchTargets: {
      label: 'Token',
      dataType: 'token',
      description: 'Token to search for (overrides child macro search)',
    },
    rollDice: {
      label: 'Roll Formula',
      dataType: 'string',
      description: 'Dice formula (overrides child macro roll)',
    },
  };

/**
 * Analyze a child macro's node graph and extract input requirements.
 *
 * Strategy: Find "boundary nodes" — nodes that fetch external data
 * (searchActors, searchTargets, rollDice) and expose them as input
 * ports so the parent macro can override their output.
 *
 * Also find "piped-token" nodes with unconnected source/target ports
 * and expose those as token inputs.
 *
 * @param command The child macro's command string
 * @returns Array of port definitions, or empty array if no graph found
 */
export function analyzeInputRequirements(command: string): MacroInputPort[] {
  const graph = extractNodeGraph(command);
  if (!graph) return [];

  const ports: MacroInputPort[] = [];
  const seenTypes = new Set<string>();

  // Edge helper: check if a specific input port on a node has a data connection
  function hasDataPipe(nodeId: string, portId: string): boolean {
    return graph!.edges.some((e) => e.target === nodeId && e.targetHandle === `data-in-${portId}`);
  }

  for (const node of graph.nodes) {
    const type = node.data?.type as string | undefined;
    if (!type) continue;

    // ── Boundary nodes (searchActors, searchTargets, rollDice) ──
    const boundary = BOUNDARY_TYPE_MAP[type];
    if (boundary && !seenTypes.has(type)) {
      seenTypes.add(type);
      ports.push({
        id: type,
        label: boundary.label,
        dataType: boundary.dataType,
        description: boundary.description,
      });
    }

    // ── Piped-token / controlled nodes: expose unconnected source/target ports ──
    if (node.data?.actorSource === 'piped-token' || node.data?.actorSource === 'controlled') {
      const checkPorts = ['source', 'target'];
      for (const portId of checkPorts) {
        // Only expose if this port is NOT already connected internally
        if (!hasDataPipe(node.id, portId)) {
          const portKey = `${type}-${portId}`;
          if (!seenTypes.has(portKey)) {
            seenTypes.add(portKey);
            ports.push({
              id: portKey,
              label: `${type} ${portId}`,
              dataType: 'token',
              description: `Override the '${portId}' for ${type}`,
            });
          }
        }
      }
    }
  }

  // Deduplicate by ID (in case multiple nodes of same type)
  const seen = new Set<string>();
  return ports.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

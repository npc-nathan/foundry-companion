import { describe, it, expect } from 'vitest';
import { extractNodeGraph, analyzeInputRequirements } from '@/lib/parse-macro-inputs';

describe('extractNodeGraph', () => {
  it('returns parsed graph from valid embedded comment', () => {
    const command = [
      '// Some macro code',
      '// __NODE_GRAPH_V2__',
      '// {"nodes":[{"id":"n1","data":{"type":"searchActors"}}],"edges":[]}',
      '// __END_NODE_GRAPH__',
      'const result = await something();',
    ].join('\n');
    const result = extractNodeGraph(command);
    expect(result).not.toBeNull();
    expect(result!.nodes).toHaveLength(1);
    expect(result!.nodes[0].id).toBe('n1');
    expect(result!.nodes[0].data.type).toBe('searchActors');
    expect(result!.edges).toEqual([]);
  });

  it('returns null when no graph comment exists', () => {
    const command = '// Just a plain macro\nconsole.log("hello");';
    expect(extractNodeGraph(command)).toBeNull();
  });

  it('returns null when graph JSON is malformed', () => {
    const command = ['// __NODE_GRAPH_V2__', '// {this is not json}', '// __END_NODE_GRAPH__'].join(
      '\n',
    );
    expect(extractNodeGraph(command)).toBeNull();
  });
});

describe('analyzeInputRequirements', () => {
  function makeCommand(nodes: unknown[], edges: unknown[] = []): string {
    return [
      '// __NODE_GRAPH_V2__',
      `// ${JSON.stringify({ nodes, edges })}`,
      '// __END_NODE_GRAPH__',
    ].join('\n');
  }

  it('exposes actor port for searchActors boundary node', () => {
    const command = makeCommand([
      { id: 'n1', data: { type: 'searchActors', nodeName: 'Find PC' } },
    ]);
    const ports = analyzeInputRequirements(command);
    expect(ports).toHaveLength(1);
    expect(ports[0].id).toBe('Find_PC');
    expect(ports[0].label).toBe('Find PC');
    expect(ports[0].dataType).toBe('actor');
  });

  it('exposes source/target ports for piped-token node', () => {
    const command = makeCommand([
      { id: 'n2', data: { type: 'damageActor', nodeName: 'Fireball', actorSource: 'piped-token' } },
    ]);
    const ports = analyzeInputRequirements(command);
    expect(ports).toHaveLength(2);
    // safeJsKey keeps hyphens (part of $- range), so "Fireball-source" not "Fireball_source"
    expect(ports.map((p) => p.id)).toEqual(['Fireball-source', 'Fireball-target']);
    expect(ports.map((p) => p.dataType)).toEqual(['token', 'token']);
  });

  it('does not expose connected ports on piped-token nodes', () => {
    const command = makeCommand(
      [
        { id: 'n1', data: { type: 'searchActors', nodeName: 'Find' } },
        {
          id: 'n2',
          data: { type: 'damageActor', nodeName: 'Fireball', actorSource: 'piped-token' },
        },
      ],
      [{ source: 'n1', target: 'n2', sourceHandle: 'data-out', targetHandle: 'data-in-source' }],
    );
    const ports = analyzeInputRequirements(command);
    // n2 should only expose 'target' because 'source' is connected
    const pipedPorts = ports.filter((p) => p.id.startsWith('Fireball'));
    expect(pipedPorts).toHaveLength(1);
    expect(pipedPorts[0].id).toBe('Fireball-target');
  });

  it('returns empty array when no graph found', () => {
    const ports = analyzeInputRequirements('// plain macro');
    expect(ports).toEqual([]);
  });

  it('exposes source/target for controlled actor source', () => {
    const command = makeCommand([
      { id: 'n3', data: { type: 'healActor', nodeName: 'Heal', actorSource: 'controlled' } },
    ]);
    const ports = analyzeInputRequirements(command);
    expect(ports).toHaveLength(2);
    expect(ports.map((p) => p.id)).toEqual(['Heal-source', 'Heal-target']);
  });

  it('exposes rollDice as string port', () => {
    const command = makeCommand([{ id: 'n4', data: { type: 'rollDice', nodeName: 'Roll Check' } }]);
    const ports = analyzeInputRequirements(command);
    expect(ports).toHaveLength(1);
    expect(ports[0].id).toBe('Roll_Check');
    expect(ports[0].dataType).toBe('string');
    expect(ports[0].label).toBe('Roll Check');
  });

  it('skips nodes without a type field', () => {
    const command = makeCommand([{ id: 'n5', data: { nodeName: 'NoType' } }]);
    const ports = analyzeInputRequirements(command);
    expect(ports).toEqual([]);
  });

  it('combines multiple boundary nodes', () => {
    const command = makeCommand([
      { id: 'n1', data: { type: 'searchActors', nodeName: 'Find' } },
      { id: 'n2', data: { type: 'rollDice', nodeName: 'Damage Roll' } },
    ]);
    const ports = analyzeInputRequirements(command);
    expect(ports).toHaveLength(2);
    expect(ports[0].dataType).toBe('actor');
    expect(ports[1].dataType).toBe('string');
  });
});

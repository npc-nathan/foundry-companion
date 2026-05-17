// ─── Output Schemas for Node Data Ports ───────────────────
// Each data-producing node declares what fields its output(s) contain.
// These power the Dynamic Content picker in the Expression Editor.
//
// The 'dataType' field maps to handle colors in node-editor.tsx:
//   any=cyan, number=blue, string=yellow, actor=emerald, token=rose, scene=teal, boolean=purple

export type FieldType = 'string' | 'number' | 'boolean' | 'actor' | 'token' | 'scene' | 'object';

export interface SchemaField {
  key: string; // Dot-notation path to the field value
  label: string; // Human-readable label shown in the picker
  type: FieldType; // Semantic type for type-aware operator filtering
  path?: string; // Override access path (defaults to key)
}

export interface DataPortSchema {
  portId: string; // e.g. 'actor', 'hp', 'result'
  portLabel: string; // e.g. 'Actor', 'HP', 'Result'
  portType: FieldType; // Base type of the port (for top-level color)
  fields: SchemaField[]; // Sub-fields available on this port's value
}

export interface NodeSchema {
  type: string;
  label: string;
  description: string;
  outputs: DataPortSchema[];
  example?: Record<string, unknown>; // Example output values for previews
}

// ─── Actor sub-schema ─────────────────────────────────
// Fields available on a Foundry Actor document (D&D5e)
const ACTOR_FIELDS: SchemaField[] = [
  { key: 'name', label: 'Name', type: 'string' },
  { key: 'type', label: 'Type (character/npc)', type: 'string' },
  { key: 'system.details.level', label: 'Level', type: 'number' },
  { key: 'system.details.race', label: 'Race', type: 'string' },
  { key: 'system.details.class', label: 'Class', type: 'string' },
  { key: 'system.attributes.hp.value', label: 'Current HP', type: 'number' },
  { key: 'system.attributes.hp.max', label: 'Max HP', type: 'number' },
  { key: 'system.attributes.hp.temp', label: 'Temp HP', type: 'number' },
  { key: 'system.attributes.ac.value', label: 'Armor Class', type: 'number' },
  { key: 'system.attributes.init.value', label: 'Initiative Bonus', type: 'number' },
  { key: 'system.attributes.movement.walk', label: 'Speed (Walk)', type: 'number' },
  { key: 'system.abilities.str.value', label: 'STR', type: 'number' },
  { key: 'system.abilities.str.mod', label: 'STR Modifier', type: 'number' },
  { key: 'system.abilities.dex.value', label: 'DEX', type: 'number' },
  { key: 'system.abilities.dex.mod', label: 'DEX Modifier', type: 'number' },
  { key: 'system.abilities.con.value', label: 'CON', type: 'number' },
  { key: 'system.abilities.con.mod', label: 'CON Modifier', type: 'number' },
  { key: 'system.abilities.int.value', label: 'INT', type: 'number' },
  { key: 'system.abilities.int.mod', label: 'INT Modifier', type: 'number' },
  { key: 'system.abilities.wis.value', label: 'WIS', type: 'number' },
  { key: 'system.abilities.wis.mod', label: 'WIS Modifier', type: 'number' },
  { key: 'system.abilities.cha.value', label: 'CHA', type: 'number' },
  { key: 'system.abilities.cha.mod', label: 'CHA Modifier', type: 'number' },
  { key: 'system.skills.prc.passive', label: 'Passive Perception', type: 'number' },
  { key: 'system.attributes.spellLevel', label: 'Spellcaster Level', type: 'number' },
  { key: 'system.attributes.spellcasting', label: 'Spellcasting Ability', type: 'string' },
  { key: 'system.traits.size', label: 'Size', type: 'string' },
  { key: 'system.details.alignment', label: 'Alignment', type: 'string' },
  { key: 'system.details.xp.value', label: 'XP', type: 'number' },
  { key: 'system.details.cr', label: 'CR', type: 'number' },
  { key: 'system.attributes.exhaustion', label: 'Exhaustion Level', type: 'number' },
  { key: 'system.attributes.bonuses.mwak.attack', label: 'Melee Attack Bonus', type: 'number' },
  { key: 'system.attributes.bonuses.mwak.damage', label: 'Melee Damage Bonus', type: 'number' },
  { key: 'system.attributes.bonuses.rwak.attack', label: 'Ranged Attack Bonus', type: 'number' },
  { key: 'system.attributes.bonuses.rwak.damage', label: 'Ranged Damage Bonus', type: 'number' },
  { key: 'system.attributes.bonuses.spell.attack', label: 'Spell Attack Bonus', type: 'number' },
  { key: 'system.attributes.bonuses.spell.dc', label: 'Spell Save DC Bonus', type: 'number' },
];

// ─── Token sub-schema ─────────────────────────────────
const TOKEN_FIELDS: SchemaField[] = [
  { key: 'name', label: 'Token Name', type: 'string' },
  { key: 'x', label: 'X Position (px)', type: 'number' },
  { key: 'y', label: 'Y Position (px)', type: 'number' },
  { key: 'elevation', label: 'Elevation', type: 'number' },
  { key: 'width', label: 'Width (grid units)', type: 'number' },
  { key: 'height', label: 'Height (grid units)', type: 'number' },
  { key: 'rotation', label: 'Rotation (degrees)', type: 'number' },
  { key: 'alpha', label: 'Opacity', type: 'number' },
  { key: 'locked', label: 'Locked', type: 'boolean' },
  { key: 'hidden', label: 'Hidden', type: 'boolean' },
  { key: 'disposition', label: 'Disposition', type: 'number' },
];

// ─── Scene sub-schema ─────────────────────────────────
const SCENE_FIELDS: SchemaField[] = [
  { key: 'name', label: 'Name', type: 'string' },
  { key: 'width', label: 'Width (px)', type: 'number' },
  { key: 'height', label: 'Height (px)', type: 'number' },
  { key: 'padding', label: 'Padding (px)', type: 'number' },
  { key: 'backgroundColor', label: 'Background Color', type: 'string' },
  { key: 'grid.type', label: 'Grid Type (0=none,1=square,2=hex)', type: 'number' },
  { key: 'grid.size', label: 'Grid Size (px)', type: 'number' },
  { key: 'img', label: 'Background Image URL', type: 'string' },
  { key: 'navOrder', label: 'Navigation Order', type: 'number' },
  { key: 'navigation', label: 'Show in Navigation', type: 'boolean' },
  { key: 'tokenVision', label: 'Token Vision Enabled', type: 'boolean' },
  { key: 'fogExploration', label: 'Fog Exploration', type: 'boolean' },
  { key: 'globalLight', label: 'Global Illumination', type: 'boolean' },
  { key: 'darkness', label: 'Darkness Level (0-1)', type: 'number' },
  { key: 'active', label: 'Currently Active', type: 'boolean' },
];

// ─── All node schemas ──────────────────────────────────

export const NODE_SCHEMAS: Record<string, NodeSchema> = {
  // ── Data Producers ──

  rollDice: {
    type: 'rollDice',
    label: 'Roll Dice',
    description: 'Roll a dice formula and output the total',
    outputs: [
      {
        portId: 'result',
        portLabel: 'Result',
        portType: 'number',
        fields: [{ key: '', label: 'Roll Total', type: 'number', path: '' }],
      },
    ],
    example: { result: 17 },
  },

  variable: {
    type: 'variable',
    label: 'Variable',
    description: 'Define a variable with any value',
    outputs: [
      {
        portId: 'value',
        portLabel: 'Value',
        portType: 'object',
        fields: [{ key: '', label: 'Variable Value', type: 'object', path: '' }],
      },
    ],
    example: { value: '42' },
  },

  searchActors: {
    type: 'searchActors',
    label: 'Search Actors',
    description: 'Find an actor by name and access all their fields',
    outputs: [
      {
        portId: 'actor',
        portLabel: 'Actor',
        portType: 'actor',
        fields: ACTOR_FIELDS,
      },
    ],
    example: {
      name: 'Gandalf',
      type: 'npc',
      level: 20,
      hp: 85,
      maxHp: 85,
      armorClass: 15,
      STR: 10,
      DEX: 14,
      CON: 16,
      INT: 18,
      WIS: 12,
      CHA: 20,
    },
  },

  searchTargets: {
    type: 'searchTargets',
    label: 'Search Targets',
    description: 'Get the currently targeted token',
    outputs: [
      {
        portId: 'target',
        portLabel: 'Target',
        portType: 'token',
        fields: [...TOKEN_FIELDS, { key: 'actor', label: 'Actor (nested)', type: 'actor' }],
      },
    ],
    example: {
      name: 'Goblin Archer',
      x: 1200,
      y: 800,
      elevation: 0,
    },
  },

  searchScenes: {
    type: 'searchScenes',
    label: 'Search Scenes',
    description: 'Find a scene by name',
    outputs: [
      {
        portId: 'scene',
        portLabel: 'Scene',
        portType: 'scene',
        fields: SCENE_FIELDS,
      },
    ],
    example: {
      name: 'The Dark Forest',
      width: 4000,
      height: 3000,
      gridSize: 100,
    },
  },

  getActorHP: {
    type: 'getActorHP',
    label: 'Get Actor HP',
    description: 'Get HP, Max HP, and Temp HP from the selected token',
    outputs: [
      {
        portId: 'hp',
        portLabel: 'HP',
        portType: 'number',
        fields: [{ key: '', label: 'Current HP', type: 'number', path: '' }],
      },
      {
        portId: 'maxHp',
        portLabel: 'Max HP',
        portType: 'number',
        fields: [{ key: '', label: 'Max HP', type: 'number', path: '' }],
      },
      {
        portId: 'tempHp',
        portLabel: 'Temp HP',
        portType: 'number',
        fields: [{ key: '', label: 'Temp HP', type: 'number', path: '' }],
      },
    ],
    example: { hp: 42, maxHp: 50, tempHp: 5 },
  },

  condition: {
    type: 'condition',
    label: 'Condition',
    description: 'If/else branching with boolean output',
    outputs: [
      {
        portId: 'result',
        portLabel: 'Result',
        portType: 'boolean',
        fields: [{ key: '', label: 'Condition Result', type: 'boolean', path: '' }],
      },
    ],
    example: { result: true },
  },

  rollTable: {
    type: 'rollTable',
    label: 'Roll Table',
    description: 'Roll on a random table and get the result text',
    outputs: [
      {
        portId: 'result',
        portLabel: 'Result',
        portType: 'string',
        fields: [{ key: '', label: 'Roll Result Text', type: 'string', path: '' }],
      },
    ],
    example: { result: 'Potion of Healing' },
  },
};

// ─── Helper Functions ──────────────────────────────────

/**
 * Get the schema for a node type
 */
export function getNodeSchema(type: string): NodeSchema | undefined {
  // eslint-disable-next-line security/detect-object-injection -- NODE_SCHEMAS is a const enum of known types
  return NODE_SCHEMAS[type];
}

/**
 * Get flattened field list for a specific port on a node
 * Handles the root-level scalar case (empty key = the port value itself)
 */
export function getPortFields(nodeType: string, portId: string): SchemaField[] {
  // eslint-disable-next-line security/detect-object-injection -- NODE_SCHEMAS is a const enum of known types
  const schema = NODE_SCHEMAS[nodeType];
  if (!schema) return [];
  const port = schema.outputs.find((p) => p.portId === portId);
  if (!port) return [];
  return port.fields;
}

/**
 * Get all available fields from upstream nodes for the Expression Editor's dynamic content tree.
 * Takes node data + edges and returns a tree of available fields.
 */
export interface DynamicContentNode {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  isConnected: boolean;
  ports: DynamicContentPort[];
}

export interface DynamicContentPort {
  portId: string;
  portLabel: string;
  portType: string;
  fields: SchemaField[];
}

/**
 * Build the dynamic content tree for the Expression Editor.
 * Returns all upstream data-producing nodes and their available fields.
 */
export function buildDynamicContentTree(
  nodes: Array<{ id: string; data: { type: string; label: string } }>,
  edges: Array<{ source: string; target: string; sourceHandle?: string | null }>,
  currentNodeId: string,
): DynamicContentNode[] {
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

  const result: DynamicContentNode[] = [];

  for (const node of nodes) {
    if (node.id === currentNodeId) continue;
    const schema = NODE_SCHEMAS[node.data.type];
    if (!schema) continue;

    // Only include data-producing nodes (ones with output ports)
    const outputPorts = schema.outputs.filter((p) => {
      return p.fields.length > 0;
    });

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

/**
 * Get the "empty key" field for scalar ports (ports whose value is the field itself, like `result` on rollDice).
 * Returns the field if the port has a single field with empty key.
 */
export function getScalarPortField(nodeType: string, portId: string): SchemaField | null {
  const fields = getPortFields(nodeType, portId);
  if (fields.length === 1 && fields[0].key === '') {
    return fields[0];
  }
  return null;
}

// ─── Declarative Properties Panel Field Registry ──────────
// Defines every field that appears in the properties panel per node type.
// Powers the new expression-editor-aware properties panel.

export type FieldDefType = 'text' | 'number' | 'select' | 'expression';

export interface NodeFieldDef {
  key: string;
  label: string;
  type: FieldDefType;
  selectOptions?: { value: string; label: string }[];
  placeholder?: string;
  expressionAllowed?: boolean; // Shows [fx] button
  displayOrder?: number; // Lower = appears higher
  hideFromPanel?: boolean; // true = internal field, don't show
}

export const NODE_FIELDS: Record<string, NodeFieldDef[]> = {
  // ── Actions ──
  rollDice: [
    {
      key: 'formula',
      label: 'Formula',
      type: 'expression',
      placeholder: 'e.g. 1d20+5',
      expressionAllowed: true,
      displayOrder: 1,
    },
    {
      key: 'flavor',
      label: 'Flavor Text',
      type: 'expression',
      placeholder: 'e.g. "Sneak Attack!"',
      expressionAllowed: true,
      displayOrder: 2,
    },
  ],
  dealDamage: [
    {
      key: 'amount',
      label: 'Damage Amount',
      type: 'expression',
      placeholder: 'e.g. 10 or 1d8+3',
      expressionAllowed: true,
      displayOrder: 1,
    },
    {
      key: 'target',
      label: 'Target Override',
      type: 'expression',
      placeholder: 'token, @uuid, or Actor name',
      expressionAllowed: true,
      displayOrder: 2,
    },
  ],
  healTarget: [
    {
      key: 'amount',
      label: 'Heal Amount',
      type: 'expression',
      placeholder: 'e.g. 10 or 2d4+3',
      expressionAllowed: true,
      displayOrder: 1,
    },
    {
      key: 'target',
      label: 'Target Override',
      type: 'expression',
      placeholder: 'token, @uuid, or Actor name',
      expressionAllowed: true,
      displayOrder: 2,
    },
  ],
  sendChat: [
    {
      key: 'content',
      label: 'Message',
      type: 'expression',
      placeholder: 'e.g. "The goblin collapses!"',
      expressionAllowed: true,
      displayOrder: 1,
    },
    {
      key: 'mode',
      label: 'Mode',
      type: 'select',
      selectOptions: [
        { value: 'OOC', label: 'OOC (out of character)' },
        { value: 'IC', label: 'IC (in character)' },
        { value: 'EMOTE', label: 'Emote' },
        { value: 'WHISPER', label: 'Whisper' },
      ],
      displayOrder: 2,
    },
  ],
  applyEffect: [
    {
      key: 'effectName',
      label: 'Effect Name',
      type: 'expression',
      placeholder: 'e.g. Burning, Poisoned, Bless',
      expressionAllowed: true,
      displayOrder: 1,
    },
    {
      key: 'amount',
      label: 'Duration (seconds)',
      type: 'expression',
      placeholder: 'e.g. 60',
      expressionAllowed: true,
      displayOrder: 2,
    },
    {
      key: 'target',
      label: 'Target Override',
      type: 'expression',
      placeholder: 'token, @uuid, or Actor name',
      expressionAllowed: true,
      displayOrder: 3,
    },
  ],
  applyStatus: [
    {
      key: 'statusId',
      label: 'Status Effect',
      type: 'select',
      selectOptions: [
        { value: 'blinded', label: 'Blinded' },
        { value: 'charmed', label: 'Charmed' },
        { value: 'deafened', label: 'Deafened' },
        { value: 'exhaustion', label: 'Exhaustion' },
        { value: 'frightened', label: 'Frightened' },
        { value: 'grappled', label: 'Grappled' },
        { value: 'incapacitated', label: 'Incapacitated' },
        { value: 'invisible', label: 'Invisible' },
        { value: 'paralyzed', label: 'Paralyzed' },
        { value: 'petrified', label: 'Petrified' },
        { value: 'poisoned', label: 'Poisoned' },
        { value: 'prone', label: 'Prone' },
        { value: 'restrained', label: 'Restrained' },
        { value: 'stunned', label: 'Stunned' },
        { value: 'unconscious', label: 'Unconscious' },
        { value: 'concentration', label: 'Concentration' },
      ],
      displayOrder: 1,
    },
  ],
  abilityCheck: [
    {
      key: 'ability',
      label: 'Ability',
      type: 'select',
      selectOptions: [
        { value: 'str', label: 'Strength (STR)' },
        { value: 'dex', label: 'Dexterity (DEX)' },
        { value: 'con', label: 'Constitution (CON)' },
        { value: 'int', label: 'Intelligence (INT)' },
        { value: 'wis', label: 'Wisdom (WIS)' },
        { value: 'cha', label: 'Charisma (CHA)' },
      ],
      displayOrder: 1,
    },
    {
      key: 'flavor',
      label: 'Flavor Text',
      type: 'expression',
      placeholder: 'e.g. "Bend Bars"',
      expressionAllowed: true,
      displayOrder: 2,
    },
  ],
  skillCheck: [
    {
      key: 'skill',
      label: 'Skill',
      type: 'select',
      selectOptions: [
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
      ],
      displayOrder: 1,
    },
    {
      key: 'flavor',
      label: 'Flavor Text',
      type: 'expression',
      placeholder: 'e.g. "Search for traps"',
      expressionAllowed: true,
      displayOrder: 2,
    },
  ],
  concentrationSave: [
    {
      key: 'damageAmount',
      label: 'Damage Taken',
      type: 'expression',
      placeholder: 'e.g. 14',
      expressionAllowed: true,
      displayOrder: 1,
    },
  ],
  deathSave: [
    // No configurable fields
  ],
  rollTable: [
    {
      key: 'tableName',
      label: 'Table Name',
      type: 'expression',
      placeholder: 'e.g. "Treasure Horde"',
      expressionAllowed: true,
      displayOrder: 1,
    },
    {
      key: 'tableId',
      label: 'Table ID (fallback)',
      type: 'text',
      placeholder: 'UUID if name fails',
      displayOrder: 2,
    },
  ],
  playSound: [
    {
      key: 'playlistName',
      label: 'Playlist Name',
      type: 'expression',
      placeholder: 'e.g. "Battle Themes"',
      expressionAllowed: true,
      displayOrder: 1,
    },
    {
      key: 'soundName',
      label: 'Sound Name',
      type: 'expression',
      placeholder: 'e.g. "Thunderclap"',
      expressionAllowed: true,
      displayOrder: 2,
    },
  ],
  toggleScene: [
    {
      key: 'sceneName',
      label: 'Scene Name',
      type: 'expression',
      placeholder: 'e.g. "The Dark Forest"',
      expressionAllowed: true,
      displayOrder: 1,
    },
    {
      key: 'sceneId',
      label: 'Scene ID (fallback)',
      type: 'text',
      placeholder: 'UUID if name fails',
      displayOrder: 2,
    },
  ],
  // ── Logic ──
  condition: [
    {
      key: 'condition',
      label: 'Expression',
      type: 'text',
      placeholder: 'Or use the fx button to build conditions',
      expressionAllowed: true,
      displayOrder: 1,
    },
  ],
  // ── Data ──
  variable: [
    { key: 'name', label: 'Variable Name', type: 'text', placeholder: 'myVar', displayOrder: 1 },
    {
      key: 'value',
      label: 'Value',
      type: 'expression',
      placeholder: '42 or "hello" or rollResult',
      expressionAllowed: true,
      displayOrder: 2,
    },
  ],
  // ── Search / Data Source ──
  searchActors: [
    {
      key: 'actorQuery',
      label: 'Actor Name',
      type: 'expression',
      placeholder: 'e.g. "Gandalf" or "Goblin #3"',
      expressionAllowed: true,
      displayOrder: 1,
    },
  ],
  searchTargets: [],
  searchScenes: [
    {
      key: 'sceneName',
      label: 'Scene Name',
      type: 'expression',
      placeholder: 'e.g. "The Dark Forest"',
      expressionAllowed: true,
      displayOrder: 1,
    },
  ],
  getActorHP: [],
  runMacro: [
    {
      key: 'macroName',
      label: 'Macro Name',
      type: 'text',
      placeholder: '"Healing Word" or "Fireball"',
      displayOrder: 1,
    },
    {
      key: 'macroUuid',
      label: 'Macro UUID',
      type: 'text',
      placeholder: 'UUID from Foundry',
      displayOrder: 2,
    },
  ],
};

/**
 * Get field definitions for a node type, including module-mapped properties.
 */
export function getNodeFields(
  nodeType: string,
  moduleId?: string,
  moduleNodeFields?: {
    key: string;
    label: string;
    type: string;
    options?: { value: string; label: string }[];
  }[],
): NodeFieldDef[] {
  // Module-mapped nodes get their fields from the mapping definition
  if (moduleId && moduleNodeFields) {
    return moduleNodeFields.map((f) => ({
      key: f.key,
      label: f.label,
      type: (f.type === 'select' || f.options ? 'select' : 'expression') as FieldDefType,
      selectOptions: f.options,
      expressionAllowed: f.type !== 'select',
      placeholder: `Enter ${f.label.toLowerCase()}...`,
    }));
  }
  // eslint-disable-next-line security/detect-object-injection -- NODE_FIELDS is a const enum of known types
  return NODE_FIELDS[nodeType] || [];
}

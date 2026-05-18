// ─── Single Source of Truth for All Node Definitions ──────
// Every node type is defined once here. The palette, data ports,
// property fields, output schemas, and code generation all derive
// from this registry.
//
// To add a new node type: add one object to NODE_DEFINITIONS.
// To modify a node: change its definition here.
//
// actorSource determines how the node gets its actor reference:
//   'none'         — no actor needed (rollDice, sendChat, condition...)
//   'piped-token'  — accepts data pipe on 'target' port, falls back to controlled token
//   'controlled'   — only works from selected token, guard required

import {
  Blocks,
  Crosshair,
  Shield,
  Skull,
  Table2,
  Volume2,
  Image,
  Search,
  Target,
  Puzzle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { getModuleNodeDefinition } from '@/lib/module-mappings';
import type { MacroInputPort } from '@/lib/parse-macro-inputs';

// ─── Types ──────────────────────────────────────────────────────

export type NodeCategory = 'action' | 'logic' | 'data' | 'macro' | 'module';

export type ActorSource = 'none' | 'piped-token' | 'controlled';

export interface PortDefinition {
  id: string;
  label: string;
  type: 'input' | 'output';
  dataType: 'any' | 'number' | 'string' | 'boolean' | 'actor' | 'token' | 'scene' | 'roll';
}

export type FieldDefType = 'text' | 'number' | 'select' | 'expression';

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldDefType;
  selectOptions?: { value: string; label: string }[];
  placeholder?: string;
  expressionAllowed?: boolean;
  displayOrder?: number;
  hideFromPanel?: boolean;
}

export type SchemaFieldType = 'string' | 'number' | 'boolean' | 'actor' | 'token' | 'scene' | 'object' | 'roll';

export interface PaletteItem {
  type: string;
  label: string;
  category: NodeCategory;
  description: string;
  icon?: ReactNode;
  defaultData: Record<string, unknown>;
}

export interface SchemaField {
  key: string;
  label: string;
  type: SchemaFieldType;
  path?: string;
}

export interface OutputPortSchema {
  portId: string;
  portLabel: string;
  portType: SchemaFieldType;
  fields: SchemaField[];
}

export interface CodeGenContext {
  nodeId: string;
  d: Record<string, unknown>;
  indent: string;
  fieldVal: (fieldKey: string, fallback: string) => string;
  dataVar: (portId: string) => string;
  dataForInput: (fieldKey: string) => string | null;
  esc: (s: string) => string;
}

export interface NodeDefinition {
  type: string;
  label: string;
  category: NodeCategory;
  description: string;
  icon: ReactNode;
  /** Module ID if this is a module node (e.g. 'dfreds-convenient-effects') */
  moduleId?: string;
  defaultData: Record<string, unknown>;
  ports: PortDefinition[];
  fields: FieldDefinition[];
  outputSchema?: OutputPortSchema[];
  example?: Record<string, unknown>;
  actorSource: ActorSource;
  codeGen: (ctx: CodeGenContext) => string[];
}

// ─── Shared Sub-Schemas ─────────────────────────────────────────

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

// ─── Shared Field Definitions ───────────────────────────────────

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
  { value: 'intl', label: 'Intimidation (CHA)' },
];

const ABILITY_OPTIONS = [
  { value: 'str', label: 'Strength (STR)' },
  { value: 'dex', label: 'Dexterity (DEX)' },
  { value: 'con', label: 'Constitution (CON)' },
  { value: 'int', label: 'Intelligence (INT)' },
  { value: 'wis', label: 'Wisdom (WIS)' },
  { value: 'cha', label: 'Charisma (CHA)' },
];

const STATUS_OPTIONS = [
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
];

const MODE_OPTIONS = [
  { value: 'OOC', label: 'OOC (out of character)' },
  { value: 'IC', label: 'IC (in character)' },
  { value: 'EMOTE', label: 'Emote' },
  { value: 'WHISPER', label: 'Whisper' },
];

/** Sanitize a node name for use as a JavaScript identifier in generated code.
 *  "Source Actor" → "Source_Actor", "heal?target" → "heal_target". */
function safeJsKey(name: string): string {
  return name.replace(/[^a-zA-Z0-9_$-]/g, '_');
}

// ─── The Registry ───────────────────────────────────────────────

export const NODE_DEFINITIONS: NodeDefinition[] = [
  // ── Actions ────────────────────────────────────────────────
  {
    type: 'rollDice',
    label: 'Roll Dice',
    category: 'action',
    description: 'Roll a dice formula',
    icon: <Blocks className="h-3 w-3 text-blue-400" />,
    defaultData: { formula: '1d20', flavor: '' },
    actorSource: 'none',
    ports: [
      { id: 'result', label: 'Result', type: 'output', dataType: 'number' },
      { id: 'roll_object', label: 'Roll Object', type: 'output', dataType: 'roll' },
    ],
    fields: [
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
    outputSchema: [
      {
        portId: 'result',
        portLabel: 'Result',
        portType: 'number',
        fields: [{ key: '', label: 'Roll Total', type: 'number', path: '' }],
      },
      {
        portId: 'roll_object',
        portLabel: 'Roll Object',
        portType: 'roll',
        fields: [],
      },
    ],
    example: { result: 17 },
    codeGen: ({ d, indent, dataVar, esc }) => {
      const formula = String(d.formula || '1d20');
      const nodeName = safeJsKey(String(d.nodeName || 'rollDice'));
      return [
        indent + '// Roll Dice',
        indent + 'const __formula = __args?.' + nodeName,
        indent + 'const ' + dataVar('roll_object') + ' = typeof __formula === "number" ? { total: __formula } : null',
        indent + 'const ' + dataVar('result') + ' = typeof __formula === "number" ? __formula : (() => {',
        indent + '  const f = __formula || "' + esc(formula) + '"',
        indent + '  const r = new Roll(f)',
        indent + '  r.evaluateSync()',
        ...(d.flavor ? [indent + '  r.toMessage({ flavor: "' + esc(String(d.flavor)) + '" })'] : []),
        indent + '  return r.total',
        indent + '})()',
      ];
    },
  },

  {
    type: 'dealDamage',
    label: 'Deal Damage',
    category: 'action',
    description: 'Deal damage to selected token',
    icon: <Crosshair className="h-3 w-3 text-red-400" />,
    defaultData: { amount: '10' },
    actorSource: 'piped-token',
    ports: [
      { id: 'amount', label: 'Amount', type: 'input', dataType: 'number' },
      { id: 'source', label: 'Source', type: 'input', dataType: 'token' },
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
    ],
    fields: [
      {
        key: 'amount',
        label: 'Damage Amount',
        type: 'expression',
        placeholder: 'e.g. 10 or 1d8+3',
        expressionAllowed: true,
        displayOrder: 1,
      },
      {
        key: 'source',
        label: 'Source Override',
        type: 'expression',
        placeholder: 'token, @uuid, or Actor name (deals the damage)',
        expressionAllowed: true,
        displayOrder: 2,
      },
      {
        key: 'target',
        label: 'Target Override',
        type: 'expression',
        placeholder: 'token, @uuid, or Actor name (takes the damage)',
        expressionAllowed: true,
        displayOrder: 3,
      },
    ],
    codeGen: ({ d, indent, fieldVal }) => {
      const damount = fieldVal('amount', String(d.amount || '10'));
      const dmgAmountVal = '(' + damount + ')';
      const sourceExpr = fieldVal('source', 'token');
      const targetExpr = fieldVal('target', 'token');
      return [
        indent + '// Deal Damage -> source deals damage to target',
        indent + 'const dmgSource = ' + sourceExpr,
        indent + 'const dmgTarget = ' + targetExpr,
        indent + 'const dmgSourceActor = dmgSource?.actor || dmgSource',
        indent + 'const dmgTargetActor = dmgTarget?.actor || dmgTarget',
        indent + 'if (dmgTargetActor) {',
        indent + '  let dmgTotal = ' + dmgAmountVal,
        indent + '  // Support dice formulas like 1d8+3',
        indent + "  if (typeof dmgTotal === 'string' && /^\\d*d\\d/i.test(dmgTotal)) {",
        indent + '    const r = await new Roll(dmgTotal).evaluate()',
        indent + '    dmgTotal = r.total',
        indent + '  }',
        indent + '  const cur = dmgTargetActor.system.attributes.hp.value || 0',
        indent + '  const newHp = Math.max(0, cur - dmgTotal)',
        indent + '  await dmgTargetActor.update({ "system.attributes.hp.value": newHp })',
        indent + '  const srcName = dmgSource?.name || dmgSourceActor?.name || "Someone"',
        indent + '  const tgtName = dmgTarget?.name || dmgTargetActor?.name || "Someone"',
        indent + '  ChatMessage.create({ content: srcName + " deals " + dmgTotal + " damage to " + tgtName + "." })',
        indent + '}',
      ];
    },
  },

  {
    type: 'healTarget',
    label: 'Heal Target',
    category: 'action',
    description: 'Heal selected token',
    icon: <Crosshair className="h-3 w-3 text-green-400" />,
    defaultData: { amount: '10' },
    actorSource: 'piped-token',
    ports: [
      { id: 'amount', label: 'Amount', type: 'input', dataType: 'number' },
      { id: 'source', label: 'Source', type: 'input', dataType: 'token' },
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
    ],
    fields: [
      {
        key: 'amount',
        label: 'Heal Amount',
        type: 'expression',
        placeholder: 'e.g. 10 or 2d4+3',
        expressionAllowed: true,
        displayOrder: 1,
      },
      {
        key: 'source',
        label: 'Source Override',
        type: 'expression',
        placeholder: 'token, @uuid, or Actor name (does the healing)',
        expressionAllowed: true,
        displayOrder: 2,
      },
      {
        key: 'target',
        label: 'Target Override',
        type: 'expression',
        placeholder: 'token, @uuid, or Actor name (receives healing)',
        expressionAllowed: true,
        displayOrder: 3,
      },
    ],
    codeGen: ({ d, indent, fieldVal }) => {
      const hamount = fieldVal('amount', String(d.amount || '10'));
      const healAmountVal = '(' + hamount + ')';
      const sourceExpr = fieldVal('source', 'token');
      const htargetExpr = fieldVal('target', 'token');
      return [
        indent + '// Heal Target -> source heals target',
        indent + 'const healSource = ' + sourceExpr,
        indent + 'const healTarget_ = ' + htargetExpr,
        indent + 'const healSourceActor = healSource?.actor || healSource',
        indent + 'const hActorRef = healTarget_?.actor || healTarget_',
        indent + 'if (hActorRef) {',
        indent + '  const cur = hActorRef.system.attributes.hp.value || 0',
        indent + '  const max = hActorRef.system.attributes.hp.max || 999',
        indent + '  const newHp = Math.min(max, cur + ' + healAmountVal + ')',
        indent + '  await hActorRef.update({ "system.attributes.hp.value": newHp })',
        indent + '  const srcName = healSource?.name || healSourceActor?.name || "Someone"',
        indent + '  const tgtName = healTarget_?.name || hActorRef.name || "Someone"',
        indent + '  ChatMessage.create({ content: srcName + " heals " + tgtName + " for " + ' + healAmountVal + ' + "." })',
        indent + '}',
      ];
    },
  },

  {
    type: 'sendChat',
    label: 'Send Chat',
    category: 'action',
    description: 'Send a message to chat',
    icon: <Blocks className="h-3 w-3 text-cyan-400" />,
    defaultData: { content: 'Hello!', mode: 'OOC' },
    actorSource: 'none',
    ports: [{ id: 'content', label: 'Content', type: 'input', dataType: 'string' }],
    fields: [
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
        selectOptions: MODE_OPTIONS,
        displayOrder: 2,
      },
    ],
    codeGen: ({ d, indent, fieldVal }) => {
      const content = fieldVal('content', String(d.content || ''));
      const mode = String(d.mode || 'OOC') === 'IC' ? 'IC' : 'OOC';
      return [
        indent + '// Send Chat Message -> e.g. OOC: The goblin collapses!',
        indent + 'ChatMessage.create({',
        indent + '  content: String(' + content + '),',
        indent + '  type: CONST.CHAT_MESSAGE_TYPES.' + mode + ',',
        indent + '})',
      ];
    },
  },

  {
    type: 'applyEffect',
    label: 'Apply Effect',
    category: 'action',
    description: 'Apply an active effect',
    icon: <Blocks className="h-3 w-3 text-yellow-400" />,
    defaultData: { effectName: 'Burning', amount: '60' },
    actorSource: 'piped-token',
    ports: [
      { id: 'effectName', label: 'Effect Name', type: 'input', dataType: 'string' },
      { id: 'source', label: 'Source', type: 'input', dataType: 'token' },
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
    ],
    fields: [
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
        key: 'source',
        label: 'Source Override',
        type: 'expression',
        placeholder: 'token, @uuid, or Actor name (applies the effect)',
        expressionAllowed: true,
        displayOrder: 3,
      },
      {
        key: 'target',
        label: 'Target Override',
        type: 'expression',
        placeholder: 'token, @uuid, or Actor name (receives the effect)',
        expressionAllowed: true,
        displayOrder: 4,
      },
    ],
    codeGen: ({ d, indent, fieldVal }) => {
      const effectName = fieldVal('effectName', String(d.effectName || ''));
      const sourceExpr = fieldVal('source', 'token');
      const targetExpr = fieldVal('target', 'token');
      const dur = String(d.amount || '60');
      return [
        indent + '// Apply Effect -> source applies effect to target',
        indent + 'const applySource = ' + sourceExpr,
        indent + 'const applyTarget = ' + targetExpr,
        indent + 'const applySourceActor = applySource?.actor || applySource',
        indent + 'const applyActor = applyTarget?.actor || applyTarget',
        indent + 'if (applyActor) {',
        indent + '  const originUuid = applySourceActor?.uuid || applySource?.uuid || applyActor.uuid',
        indent + '  const effectData = {',
        indent + '    label: String(' + effectName + '),',
        indent + '    origin: originUuid,',
        indent + '    duration: { seconds: ' + (parseInt(dur) || 60) + ' }',
        indent + '  }',
        indent + '  await applyActor.createEmbeddedDocuments("ActiveEffect", [effectData])',
        indent + '}',
      ];
    },
  },

  {
    type: 'applyStatus',
    label: 'Apply Status',
    category: 'action',
    description: 'Apply a status condition icon',
    icon: <Shield className="h-3 w-3 text-orange-400" />,
    defaultData: { statusId: 'poisoned' },
    actorSource: 'piped-token',
    ports: [
      { id: 'statusId', label: 'Status', type: 'input', dataType: 'string' },
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
    ],
    fields: [
      {
        key: 'statusId',
        label: 'Status Effect',
        type: 'select',
        selectOptions: STATUS_OPTIONS,
        displayOrder: 1,
      },
    ],
    codeGen: ({ indent, fieldVal }) => {
      const statusId = fieldVal('statusId', 'poisoned');
      const targetExpr = fieldVal('target', 'token');
      return [
        indent + '// Apply Status -> e.g. toggles poisoned icon on selected token',
        indent + 'const applyStatusTarget = ' + targetExpr,
        indent + 'const applyStatusActor = applyStatusTarget?.actor || applyStatusTarget',
        indent + 'if (applyStatusActor) {',
        indent + '  await applyStatusActor.toggleStatusEffect(String(' + statusId + '), { active: true })',
        indent + '}',
      ];
    },
  },

  {
    type: 'abilityCheck',
    label: 'Ability Check',
    category: 'action',
    description: 'Roll an ability check',
    icon: <Blocks className="h-3 w-3 text-indigo-400" />,
    defaultData: { ability: 'str', flavor: '' },
    actorSource: 'piped-token',
    ports: [
      { id: 'ability', label: 'Ability', type: 'input', dataType: 'string' },
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
    ],
    fields: [
      {
        key: 'ability',
        label: 'Ability',
        type: 'select',
        selectOptions: ABILITY_OPTIONS,
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
    codeGen: ({ d, indent, fieldVal, esc }) => {
      const ability = fieldVal('ability', String(d.ability || 'str'));
      const flavors = d.flavor ? ', { flavor: "' + esc(String(d.flavor)) + '" }' : '';
      const targetExpr = fieldVal('target', 'token');
      return [
        indent + '// Ability Check -> e.g. STR check: d20 + modifier, result shown in chat',
        indent + 'const abCheckTarget = ' + targetExpr,
        indent + 'const abCheckActor = abCheckTarget?.actor || abCheckTarget',
        indent + 'if (abCheckActor) {',
        indent + '  await abCheckActor.rollAbilityTest(String(' + ability + ')' + flavors + ')',
        indent + '}',
      ];
    },
  },

  {
    type: 'skillCheck',
    label: 'Skill Check',
    category: 'action',
    description: 'Roll a skill check',
    icon: <Blocks className="h-3 w-3 text-indigo-400" />,
    defaultData: { skill: 'prc', flavor: '' },
    actorSource: 'piped-token',
    ports: [
      { id: 'skill', label: 'Skill', type: 'input', dataType: 'string' },
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
    ],
    fields: [
      {
        key: 'skill',
        label: 'Skill',
        type: 'select',
        selectOptions: SKILL_OPTIONS,
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
    codeGen: ({ d, indent, fieldVal, esc }) => {
      const skill = fieldVal('skill', String(d.skill || 'prc'));
      const flavors = d.flavor ? ', { flavor: "' + esc(String(d.flavor)) + '" }' : '';
      const targetExpr = fieldVal('target', 'token');
      return [
        indent + '// Skill Check -> e.g. Perception check: d20 + WIS, result shown in chat',
        indent + 'const skCheckTarget = ' + targetExpr,
        indent + 'const skCheckActor = skCheckTarget?.actor || skCheckTarget',
        indent + 'if (skCheckActor) {',
        indent + '  await skCheckActor.rollSkill(String(' + skill + ')' + flavors + ')',
        indent + '}',
      ];
    },
  },

  {
    type: 'concentrationSave',
    label: 'Concentration Save',
    category: 'action',
    description: 'Roll a concentration saving throw',
    icon: <Shield className="h-3 w-3 text-purple-400" />,
    defaultData: { damageAmount: '10' },
    actorSource: 'piped-token',
    ports: [
      { id: 'damageAmount', label: 'Damage', type: 'input', dataType: 'number' },
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
    ],
    fields: [
      {
        key: 'damageAmount',
        label: 'Damage Taken',
        type: 'expression',
        placeholder: 'e.g. 14',
        expressionAllowed: true,
        displayOrder: 1,
      },
    ],
    codeGen: ({ d, indent, fieldVal }) => {
      const dmg = fieldVal('damageAmount', String(d.damageAmount || '10'));
      const targetExpr = fieldVal('target', 'token');
      return [
        indent + '// Concentration Save -> e.g. DC 10 CON save for 14 damage taken',
        indent + 'const concTarget = ' + targetExpr,
        indent + 'const concActor = concTarget?.actor || concTarget',
        indent + 'if (concActor) {',
        indent + '  await concActor.rollConcentrationSave(Number(' + dmg + '))',
        indent + '}',
      ];
    },
  },

  {
    type: 'deathSave',
    label: 'Death Save',
    category: 'action',
    description: 'Roll a death saving throw',
    icon: <Skull className="h-3 w-3 text-red-400" />,
    defaultData: {},
    actorSource: 'piped-token',
    ports: [
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
    ],
    fields: [],
    codeGen: ({ indent, fieldVal }) => {
      const targetExpr = fieldVal('target', 'token');
      return [
        indent + '// Death Save -> e.g. d20 roll, success/fail tracked automatically',
        indent + 'const dsTarget = ' + targetExpr,
        indent + 'const dsActor = dsTarget?.actor || dsTarget',
        indent + 'if (dsActor) {',
        indent + '  await dsActor.rollDeathSave({})',
        indent + '}',
      ];
    },
  },

  {
    type: 'rollTable',
    label: 'Roll Table',
    category: 'action',
    description: 'Roll on a random table',
    icon: <Table2 className="h-3 w-3 text-amber-400" />,
    defaultData: { tableName: '', tableId: '' },
    actorSource: 'none',
    ports: [{ id: 'result', label: 'Result', type: 'output', dataType: 'string' }],
    fields: [
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
    outputSchema: [
      {
        portId: 'result',
        portLabel: 'Result',
        portType: 'string',
        fields: [{ key: '', label: 'Roll Result Text', type: 'string', path: '' }],
      },
    ],
    example: { result: 'Potion of Healing' },
    codeGen: ({ d, indent, dataVar, esc }) => {
      const tableName = String(d.tableName || '');
      const tableId = String(d.tableId || '');
      const tableRef = tableName
        ? 'game.tables.getName("' + esc(tableName) + '")'
        : tableId
          ? 'game.tables.get("' + esc(tableId) + '")'
          : 'null';
      return [
        indent + '// Roll Table: ' + (tableName || tableId) + ' -> e.g. rolled: Potion of Healing',
        indent + 'const table = ' + tableRef,
        indent + 'if (table) {',
        indent + '  const rollResult = await table.roll()',
        indent + '  const ' + dataVar('result') + ' = rollResult?.results?.[0]?.text || ""',
        indent + '}',
      ];
    },
  },

  {
    type: 'playSound',
    label: 'Play Sound',
    category: 'action',
    description: 'Play a sound from a playlist',
    icon: <Volume2 className="h-3 w-3 text-emerald-400" />,
    defaultData: { playlistName: '', soundName: '' },
    actorSource: 'none',
    ports: [],
    fields: [
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
    codeGen: ({ d, indent, esc }) => {
      const playlistName = String(d.playlistName || '');
      const soundName = String(d.soundName || '');
      const lines: string[] = [
        indent + '// Play Sound -> e.g. plays Thunderclap from Battle Themes playlist',
      ];
      if (playlistName && soundName) {
        lines.push(indent + 'const playlist = game.playlists.getName("' + esc(playlistName) + '")');
        lines.push(indent + 'if (playlist) {');
        lines.push(indent + '  const sound = playlist.sounds.getName("' + esc(soundName) + '")');
        lines.push(indent + '  if (sound) sound.play()');
        lines.push(indent + '}');
      } else if (playlistName) {
        lines.push(indent + 'const playlist = game.playlists.getName("' + esc(playlistName) + '")');
        lines.push(indent + 'if (playlist) {');
        lines.push(indent + '  playlist.play()');
        lines.push(indent + '}');
      }
      return lines;
    },
  },

  {
    type: 'toggleScene',
    label: 'Toggle Scene',
    category: 'action',
    description: 'Switch to / activate a scene',
    icon: <Image className="h-3 w-3 text-sky-400" />,
    defaultData: { sceneName: '', sceneId: '' },
    actorSource: 'none',
    ports: [{ id: 'scene', label: 'Scene', type: 'input', dataType: 'scene' }],
    fields: [
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
    codeGen: ({ d, indent, fieldVal, esc }) => {
      const sceneRef = fieldVal('scene', '');
      const sceneName = String(d.sceneName || '');
      const lines: string[] = [
        indent + '// Toggle Scene: ' + sceneName + ' -> e.g. activates The Dark Forest',
      ];
      if (sceneRef) {
        lines.push(indent + 'if (' + sceneRef + ') {');
        lines.push(indent + '  await ' + sceneRef + '.activate()');
        lines.push(indent + '}');
      } else if (sceneName) {
        lines.push(indent + 'const scene = game.scenes.getName("' + esc(sceneName) + '")');
        lines.push(indent + 'if (scene) {');
        lines.push(indent + '  await scene.activate()');
        lines.push(indent + '}');
      } else if (d.sceneId) {
        lines.push(indent + 'const scene = game.scenes.get("' + esc(String(d.sceneId)) + '")');
        lines.push(indent + 'if (scene) {');
        lines.push(indent + '  await scene.activate()');
        lines.push(indent + '}');
      }
      return lines;
    },
  },

  // ── Logic ─────────────────────────────────────────────────
  {
    type: 'condition',
    label: 'Condition',
    category: 'logic',
    description: 'If/else branching',
    icon: <Blocks className="h-3 w-3 text-amber-400" />,
    defaultData: { condition: 'true', compareField: 'name', compareValue: '' },
    actorSource: 'none',
    ports: [
      { id: 'result', label: 'Result', type: 'output', dataType: 'boolean' },
      { id: 'condition', label: 'Expression', type: 'input', dataType: 'string' },
      { id: 'trueTarget', label: 'True Branch', type: 'output', dataType: 'any' },
      { id: 'falseTarget', label: 'False Branch', type: 'output', dataType: 'any' },
    ],
    fields: [
      {
        key: 'condition',
        label: 'Expression',
        type: 'text',
        placeholder: 'Or use the fx button to build conditions',
        expressionAllowed: true,
        displayOrder: 1,
      },
    ],
    outputSchema: [
      {
        portId: 'result',
        portLabel: 'Result',
        portType: 'boolean',
        fields: [{ key: '', label: 'Condition Result', type: 'boolean', path: '' }],
      },
    ],
    example: { result: true },
    codeGen: ({ indent, fieldVal, dataForInput }) => {
      const pipedVar = dataForInput('condition');
      const cond = pipedVar || fieldVal('condition', 'true');
      return [
        indent + '// Condition -> e.g. if (rollTotal > 10) { ... } else { ... }',
        indent + 'if (' + cond + ') {',
      ];
    },
  },

  // ── Data ───────────────────────────────────────────────────
  {
    type: 'variable',
    label: 'Variable',
    category: 'data',
    description: 'Set or get a variable',
    icon: <Blocks className="h-3 w-3 text-green-400" />,
    defaultData: { name: 'myVar', value: '' },
    actorSource: 'none',
    ports: [{ id: 'value', label: 'Value', type: 'output', dataType: 'any' }],
    fields: [
      {
        key: 'name',
        label: 'Variable Name',
        type: 'text',
        placeholder: 'myVar',
        displayOrder: 1,
      },
      {
        key: 'value',
        label: 'Value',
        type: 'expression',
        placeholder: '42 or "hello" or rollResult',
        expressionAllowed: true,
        displayOrder: 2,
      },
    ],
    outputSchema: [
      {
        portId: 'value',
        portLabel: 'Value',
        portType: 'object',
        fields: [{ key: '', label: 'Variable Value', type: 'object', path: '' }],
      },
    ],
    example: { value: '42' },
    codeGen: ({ d, indent, dataVar }) => {
      const varName = String(d.name || 'myVar');
      const varValue = String(d.value || '');
      const safeValue = varValue || 'undefined';
      return [
        indent + '// Variable: ' + varName + ' -> e.g. const ' + varName + ' = 42',
        indent + 'const ' + varName + ' = ' + safeValue,
        indent + 'const ' + dataVar('value') + ' = ' + varName,
      ];
    },
  },

  // ── Search / Data Source Nodes ─────────────────────────────
  {
    type: 'searchActors',
    label: 'Search Actors',
    category: 'action',
    description: 'Search for an actor by name',
    icon: <Search className="h-3 w-3 text-sky-400" />,
    defaultData: { actorQuery: '' },
    actorSource: 'none',
    ports: [{ id: 'actor', label: 'Actor', type: 'output', dataType: 'actor' }],
    fields: [
      {
        key: 'actorQuery',
        label: 'Actor Name',
        type: 'expression',
        placeholder: 'e.g. "Gandalf" or "Goblin #3"',
        expressionAllowed: true,
        displayOrder: 1,
      },
    ],
    outputSchema: [
      {
        portId: 'actor',
        portLabel: 'Actor',
        portType: 'actor',
        fields: ACTOR_FIELDS,
      },
    ],
    example: { name: 'Gandalf', type: 'npc', level: 20, hp: 85, maxHp: 85, armorClass: 15 },
    codeGen: ({ d, indent, dataVar, esc }) => {
      const query = String(d.actorQuery || '');
      const nodeName = safeJsKey(String(d.nodeName || 'searchActors'));
      return [
        indent + '// Search Actors',
        indent + 'const ' + dataVar('actor') + ' = __args?.' + nodeName + ' || ' + (query
          ? 'game.actors.getName("' + esc(query) + '") || canvas.tokens.placeables.find(t => t.name === "' + esc(query) + '")?.actor'
          : 'game.user.targets.first()?.actor'),
      ];
    },
  },

  {
    type: 'searchTargets',
    label: 'Search Targets',
    category: 'action',
    description: 'Get currently targeted tokens',
    icon: <Target className="h-3 w-3 text-rose-400" />,
    defaultData: {},
    actorSource: 'none',
    ports: [{ id: 'target', label: 'Target', type: 'output', dataType: 'token' }],
    fields: [],
    outputSchema: [
      {
        portId: 'target',
        portLabel: 'Target',
        portType: 'token',
        fields: [...TOKEN_FIELDS, { key: 'actor', label: 'Actor (nested)', type: 'actor' }],
      },
    ],
    example: { name: 'Goblin Archer', x: 1200, y: 800, elevation: 0 },
    codeGen: ({ indent, dataVar, d }) => {
      const nodeName = safeJsKey(String(d.nodeName || 'searchTargets'));
      return [
        indent + '// Search Targets',
        indent + 'const ' + dataVar('target') + ' = __args?.' + nodeName + ' || game.user.targets.first() || token',
      ];
    },
  },

  {
    type: 'searchScenes',
    label: 'Search Scenes',
    category: 'action',
    description: 'Get a scene by name',
    icon: <Image className="h-3 w-3 text-teal-400" />,
    defaultData: { sceneName: '' },
    actorSource: 'none',
    ports: [{ id: 'scene', label: 'Scene', type: 'output', dataType: 'scene' }],
    fields: [
      {
        key: 'sceneName',
        label: 'Scene Name',
        type: 'expression',
        placeholder: 'e.g. "The Dark Forest"',
        expressionAllowed: true,
        displayOrder: 1,
      },
    ],
    outputSchema: [
      {
        portId: 'scene',
        portLabel: 'Scene',
        portType: 'scene',
        fields: SCENE_FIELDS,
      },
    ],
    example: { name: 'The Dark Forest', width: 4000, height: 3000, gridSize: 100 },
    codeGen: ({ d, indent, dataVar, esc }) => {
      const sName = String(d.sceneName || '');
      if (sName) {
        return [
          indent + '// Search Scenes: ' + sName + ' -> e.g. finds The Dark Forest scene',
          indent + 'const ' + dataVar('scene') + ' = game.scenes.getName("' + esc(sName) + '") || game.scenes.get("' + esc(sName) + '")',
        ];
      }
      return [
        indent + '// Search Scenes -> current scene',
        indent + 'const ' + dataVar('scene') + ' = canvas.scene',
      ];
    },
  },

  {
    type: 'getActorHP',
    label: 'Get Actor HP',
    category: 'action',
    description: 'Get HP & temp HP from selected token',
    icon: <Shield className="h-3 w-3 text-emerald-400" />,
    defaultData: {},
    actorSource: 'controlled',
    ports: [
      { id: 'hp', label: 'HP', type: 'output', dataType: 'number' },
      { id: 'maxHp', label: 'Max HP', type: 'output', dataType: 'number' },
      { id: 'tempHp', label: 'Temp HP', type: 'output', dataType: 'number' },
    ],
    fields: [],
    outputSchema: [
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
    codeGen: ({ indent, dataVar }) => {
      return [
        indent + '// Get Actor HP -> e.g. returns hp: 42, maxHp: 50, tempHp: 5',
        indent + 'const hpActor = token?.actor',
        indent + 'if (hpActor) {',
        indent + '  const hpData = hpActor.system.attributes.hp',
        indent + '  const ' + dataVar('hp') + ' = hpData.value',
        indent + '  const ' + dataVar('maxHp') + ' = hpData.max',
        indent + '  const ' + dataVar('tempHp') + ' = hpData.temp || 0',
        indent + '}',
      ];
    },
  },

  {
    type: 'runMacro',
    label: 'Run Macro',
    category: 'macro',
    description: 'Execute a Foundry macro',
    icon: <Puzzle className="h-3 w-3 text-purple-400" />,
    defaultData: { macroName: '', macroUuid: '', dynamicPorts: [] as MacroInputPort[] },
    actorSource: 'none',
    ports: [{ id: 'macroUuid', label: 'Macro', type: 'input', dataType: 'string' }],
    fields: [
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
    codeGen: ({ d, indent, fieldVal, esc }) => {
      const macroName = String(d.macroName || '');
      const macroRef = fieldVal('macroUuid', '');
      const dynPorts = (d.dynamicPorts || []) as MacroInputPort[];
      const lines: string[] = [
        indent + '// Run Macro: ' + macroName,
      ];

      // Build args object from dynamic ports with connected data pipes
      const argEntries: string[] = [];
      for (const port of dynPorts) {
        const val = fieldVal(port.id, '');
        if (val) argEntries.push(port.id.replace(/[^a-zA-Z0-9_$-]/g, '_') + ': ' + val);
      }

      if (argEntries.length > 0) {
        lines.push(indent + 'window.__macroArgs = { ' + argEntries.join(', ') + ' }');
      }

      if (macroRef && macroRef !== macroName) {
        lines.push(indent + 'await game.macros.get("' + esc(macroRef) + '")?.execute()');
      } else if (macroName) {
        lines.push(indent + 'await game.macros.getName("' + esc(macroName) + '")?.execute()');
      }

      if (argEntries.length > 0) {
        lines.push(indent + 'delete window.__macroArgs');
      }

      return lines;
    },
  },
];

// ─── Helper Functions ───────────────────────────────────────────

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

export function getNodeSchema(type: string): {
  outputs: OutputPortSchema[];
  example?: Record<string, unknown>;
} | undefined {
  const def = defMap.get(type);
  if (!def) return undefined;
  return {
    outputs: def.outputSchema || [],
    example: def.example,
  };
}

export function getOutputPortsForType(type: string): OutputPortSchema[] {
  return defMap.get(type)?.outputSchema || [];
}

export function getPortFields(nodeType: string, portId: string): SchemaField[] {
  const def = defMap.get(nodeType);
  if (!def || !def.outputSchema) return [];
  const port = def.outputSchema.find((p) => p.portId === portId);
  return port?.fields || [];
}

export function getScalarPortField(nodeType: string, portId: string): SchemaField | null {
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
    fields: SchemaField[];
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
      fields: SchemaField[];
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

export interface DynamicContentPort {
  portId: string;
  portLabel: string;
  portType: string;
  fields: SchemaField[];
}

export interface DynamicContentNode {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  isConnected: boolean;
  ports: DynamicContentPort[];
}

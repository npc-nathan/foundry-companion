import type { SchemaField } from './types';

// ─── Shared Sub-Schemas ─────────────────────────────────────────

export const ACTOR_FIELDS: SchemaField[] = [
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
  {
    key: 'system.attributes.movement.walk',
    label: 'Speed (Walk)',
    type: 'number',
  },
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
  {
    key: 'system.skills.prc.passive',
    label: 'Passive Perception',
    type: 'number',
  },
  {
    key: 'system.attributes.spellLevel',
    label: 'Spellcaster Level',
    type: 'number',
  },
  {
    key: 'system.attributes.spellcasting',
    label: 'Spellcasting Ability',
    type: 'string',
  },
  { key: 'system.traits.size', label: 'Size', type: 'string' },
  { key: 'system.details.alignment', label: 'Alignment', type: 'string' },
  { key: 'system.details.xp.value', label: 'XP', type: 'number' },
  { key: 'system.details.cr', label: 'CR', type: 'number' },
  {
    key: 'system.attributes.exhaustion',
    label: 'Exhaustion Level',
    type: 'number',
  },
  {
    key: 'system.attributes.bonuses.mwak.attack',
    label: 'Melee Attack Bonus',
    type: 'number',
  },
  {
    key: 'system.attributes.bonuses.mwak.damage',
    label: 'Melee Damage Bonus',
    type: 'number',
  },
  {
    key: 'system.attributes.bonuses.rwak.attack',
    label: 'Ranged Attack Bonus',
    type: 'number',
  },
  {
    key: 'system.attributes.bonuses.rwak.damage',
    label: 'Ranged Damage Bonus',
    type: 'number',
  },
  {
    key: 'system.attributes.bonuses.spell.attack',
    label: 'Spell Attack Bonus',
    type: 'number',
  },
  {
    key: 'system.attributes.bonuses.spell.dc',
    label: 'Spell Save DC Bonus',
    type: 'number',
  },
];

export const TOKEN_FIELDS: SchemaField[] = [
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

export const SCENE_FIELDS: SchemaField[] = [
  { key: 'name', label: 'Name', type: 'string' },
  { key: 'width', label: 'Width (px)', type: 'number' },
  { key: 'height', label: 'Height (px)', type: 'number' },
  { key: 'padding', label: 'Padding (px)', type: 'number' },
  { key: 'backgroundColor', label: 'Background Color', type: 'string' },
  {
    key: 'grid.type',
    label: 'Grid Type (0=none,1=square,2=hex)',
    type: 'number',
  },
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

// ─── Shared Field Options ───────────────────────────────────────

export const SKILL_OPTIONS = [
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

export const ABILITY_OPTIONS = [
  { value: 'str', label: 'Strength (STR)' },
  { value: 'dex', label: 'Dexterity (DEX)' },
  { value: 'con', label: 'Constitution (CON)' },
  { value: 'int', label: 'Intelligence (INT)' },
  { value: 'wis', label: 'Wisdom (WIS)' },
  { value: 'cha', label: 'Charisma (CHA)' },
];

export const STATUS_OPTIONS = [
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

export const MODE_OPTIONS = [
  { value: 'OOC', label: 'OOC (out of character)' },
  { value: 'IC', label: 'IC (in character)' },
  { value: 'EMOTE', label: 'Emote' },
  { value: 'WHISPER', label: 'Whisper' },
];

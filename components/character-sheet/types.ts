'use client';

/* ── Foundry API type helpers ─────────────────────────────────────────────── */

/** A generic object representing a Foundry item or spell document (partial). */
export interface FoundryDoc {
  _id?: string;
  name?: string;
  type?: string;
  img?: string;
  uuid?: string;
  system?: Record<string, unknown>;
}

/** A Foundry document with known spell-like system fields. */
export interface FoundryItem extends FoundryDoc {
  system?: {
    damage?: Record<string, unknown>;
    armor?: Record<string, unknown>;
    type?: Record<string, unknown>;
    properties?: unknown[];
    equipped?: boolean;
    attunement?: Record<string, unknown>;
    quantity?: number;
    actionType?: string;
    level?: number;
    ability?: string;
    school?: string;
    preparation?: Record<string, unknown>;
    components?: Record<string, unknown> | string;
    castingTime?: Record<string, unknown> | string;
    range?: Record<string, unknown> | string;
    duration?: Record<string, unknown> | string;
    target?: Record<string, unknown> | string;
    save?: Record<string, unknown>;
    description?: Record<string, unknown>;
  };
}

/** An active effect document from Foundry. */
export interface FoundryEffect {
  _id?: string;
  name?: string;
  label?: string;
  icon?: string;
  statuses?: string[];
  disabled?: boolean;
  changes?: { key: string; value: string; mode?: number }[];
  duration?: {
    rounds?: number;
    startTime?: number;
    seconds?: number;
    startRound?: number;
    startTurn?: number;
  };
  origin?: string;
}

/** An item-level embedded effect (from item.system.effects or item.effects). */
export interface ItemEmbeddedEffect {
  label: string;
  changes: { key: string; value: string; mode?: number }[];
  disabled?: boolean;
  icon?: string;
  origin: string;
  duration?: { rounds?: number };
}

/* ── Actor data shape (returned by useActorData) ─────────────────────────── */

export interface ActorIdentity {
  name: string;
  img: string | null;
  race: string | null;
  class: string | null;
  level: number;
  background: string | null;
  alignment: string | null;
  size: string | null;
}

export interface ActorHP {
  value: number;
  max: number;
  temp: number;
  pct: number;
}

export interface ActorCombat {
  acValue: number;
  initBonus: number;
  profBonus: number;
  speed: string;
  xp: number | null;
}

export interface ActorAbility {
  value: number;
  mod: number;
  proficient: boolean;
}

export interface ActorSkill {
  key: string;
  label: string;
  ability: string;
  total: number;
  proficient: boolean;
  profValue: number;
}

export interface ActorSave {
  ability: string;
  label: string;
  bonus: number;
  proficient: boolean;
}

export interface ActorCurrency {
  pp: number;
  gp: number;
  ep: number;
  sp: number;
  cp: number;
}

export interface ItemSection {
  label: string;
  items: FoundryItem[];
  iconName: string;
}

export interface SpellSlot {
  level: number;
  current: number;
  max: number;
}

export interface ActorTraits {
  biography: string | null;
  dr: string[];
  drCustom: string | null;
  ci: string[];
  languages: string[];
  languagesCustom: string | null;
  senses: string;
  resources: {
    label: string;
    value: number;
    max: number;
    sr: boolean;
    lr: boolean;
  }[];
}

export interface ActorData {
  identity: ActorIdentity;
  hp: ActorHP;
  combat: ActorCombat;
  abilities: Record<string, ActorAbility>;
  skills: ActorSkill[];
  saves: ActorSave[];
  weapons: FoundryItem[];
  armor: FoundryItem[];
  consumables: FoundryItem[];
  itemSections: ItemSection[];
  currency: ActorCurrency;
  spellSlots: SpellSlot[];
  spellItems: FoundryItem[];
  traits: ActorTraits;
  effects: FoundryEffect[];
  itemEffects: ItemEmbeddedEffect[];
  raw: {
    abilities: Record<string, unknown>;
    system: Record<string, unknown>;
    details: Record<string, unknown>;
    skills: Record<string, unknown>;
    traits: Record<string, unknown>;
    spells: Record<string, unknown>;
    resources: Record<string, unknown>;
  };
}

/* ── Pure helpers (no JSX) ────────────────────────────────────────────────── */

export function getMod(val: number): number {
  return Math.floor((val - 10) / 2);
}

export function hpColor(pct: number): string {
  if (pct > 50) return 'bg-green-500';
  if (pct > 20) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function buildDamageFormula(item: FoundryItem): string {
  const system = item?.system;
  const damage = system?.damage as Record<string, unknown> | undefined;
  const base = damage?.base as Record<string, unknown> | undefined;
  if (!base) return '';
  const num = (base.number as number) || 1;
  const denom = (base.denomination as number) || 4;
  const bonus = base.bonus ? `+${String(base.bonus)}` : '';
  return `${num}d${denom}${bonus}`;
}

export function formatVersatile(versatile: unknown): string {
  if (!versatile) return '';
  if (typeof versatile === 'string') return `(${versatile})`;
  if (typeof versatile !== 'object') return '';
  const v = versatile as Record<string, unknown>;
  const num = (v.number as number) || 1;
  const denom = (v.denomination as number) || 0;
  const bonus = v.bonus ? `+${String(v.bonus)}` : '';
  return denom > 0 ? `(${num}d${denom}${bonus})` : '';
}

export function formatDetailField(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    const value = obj.value ?? obj.number ?? '';
    const units = obj.units ?? '';
    return `${value}${units ? ` ${String(units)}` : ''}`;
  }
  return '—';
}

/* ── Constants ────────────────────────────────────────────────────────────── */

export const ABILITY_NAMES: Record<string, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

export const SKILL_LABELS: Record<string, string> = {
  acr: 'Acrobatics',
  ani: 'Animal Handling',
  arc: 'Arcana',
  ath: 'Athletics',
  dec: 'Deception',
  his: 'History',
  ins: 'Insight',
  int: 'Intimidation',
  inv: 'Investigation',
  med: 'Medicine',
  nat: 'Nature',
  prc: 'Perception',
  prf: 'Performance',
  rel: 'Religion',
  slt: 'Sleight of Hand',
  ste: 'Stealth',
  sur: 'Survival',
};

export const SKILL_ABILITIES: Record<string, string> = {
  acr: 'dex',
  ani: 'wis',
  arc: 'int',
  ath: 'str',
  dec: 'cha',
  his: 'int',
  ins: 'wis',
  int: 'cha',
  inv: 'int',
  med: 'wis',
  nat: 'int',
  per: 'cha',
  prc: 'wis',
  prf: 'cha',
  rel: 'int',
  slt: 'dex',
  ste: 'dex',
  sur: 'wis',
};

export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

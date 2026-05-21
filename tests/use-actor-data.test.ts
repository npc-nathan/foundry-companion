import { describe, it, expect } from 'vitest';
import { useActorData } from '../components/character-sheet/use-actor-data';
import type { FoundryItem, FoundryEffect } from '../components/character-sheet/types';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function makeActor(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      name: 'Test Hero',
      img: '/portraits/test.png',
      type: 'character',
      items: [],
      system: {
        abilities: {
          str: { value: 16 },
          dex: { value: 14 },
          con: { value: 15 },
          int: { value: 10 },
          wis: { value: 12 },
          cha: { value: 8 },
        },
        attributes: {
          hp: { value: 45, max: 45, temp: 5 },
          ac: { value: 17 },
          init: { bonus: 2 },
          movement: { walk: 30 },
        },
        details: {
          race: 'Human',
          class: 'Fighter',
          level: 5,
          background: 'Soldier',
          alignment: 'Lawful Good',
          xp: { value: 6500 },
        },
        skills: {
          acr: { value: 0 },
          ath: { value: 2 },
          prc: { value: 1 },
          ste: { value: 0 },
        },
        traits: {
          size: 'med',
          dr: { value: ['slashing'], custom: 'fire 5' },
          ci: { value: ['frightened'] },
          languages: { value: ['Common', 'Elvish'], custom: null },
        },
        spells: {
          spell1: { value: 4, max: 4 },
          spell2: { value: 3, max: 3 },
          spell3: { value: 2, max: 2 },
        },
        currency: { pp: 5, gp: 100, ep: 0, sp: 45, cp: 12 },
        resources: {
          primary: { value: 2, max: 3, label: 'Second Wind', sr: true, lr: false },
        },
      },
      ...overrides,
    },
  };
}

/* ── Suite ────────────────────────────────────────────────────────────────── */

describe('useActorData', () => {
  it('extracts identity fields', () => {
    const actor = makeActor();
    const result = useActorData(actor, { data: [] });
    expect(result.identity).toEqual({
      name: 'Test Hero',
      img: '/portraits/test.png',
      race: 'Human',
      class: 'Fighter',
      level: 5,
      background: 'Soldier',
      alignment: 'Lawful Good',
      size: 'med',
    });
  });

  it('computes HP correctly', () => {
    const result = useActorData(makeActor(), { data: [] });
    expect(result.hp).toEqual({ value: 45, max: 45, temp: 5, pct: 100 });
  });

  it('computes HP percentage correctly when damaged', () => {
    const actor = makeActor();
    (actor.data.system as Record<string, unknown>).attributes = {
      hp: { value: 20, max: 80, temp: 0 },
    };
    const result = useActorData(actor, { data: [] });
    expect(result.hp).toEqual({ value: 20, max: 80, temp: 0, pct: 25 });
  });

  it('handles missing HP gracefully', () => {
    const actor = makeActor();
    (actor.data.system as Record<string, unknown>).attributes = {};
    const result = useActorData(actor, { data: [] });
    expect(result.hp).toEqual({ value: 0, max: 1, temp: 0, pct: 0 });
  });

  it('computes ability stats with modifiers', () => {
    const result = useActorData(makeActor(), { data: [] });
    expect(result.abilities.str).toEqual({ value: 16, mod: 3, proficient: false });
    expect(result.abilities.dex).toEqual({ value: 14, mod: 2, proficient: false });
    expect(result.abilities.con).toEqual({ value: 15, mod: 2, proficient: false });
    expect(result.abilities.int).toEqual({ value: 10, mod: 0, proficient: false });
    expect(result.abilities.wis).toEqual({ value: 12, mod: 1, proficient: false });
    expect(result.abilities.cha).toEqual({ value: 8, mod: -1, proficient: false });
  });

  it('computes combat stats: AC, init, prof bonus, speed, XP', () => {
    const result = useActorData(makeActor(), { data: [] });
    expect(result.combat).toEqual({
      acValue: 17,
      initBonus: 2,
      profBonus: 3,
      speed: '30',
      xp: 6500,
    });
  });

  it('computes proficiency bonus from level', () => {
    const actor = makeActor();
    ((actor.data.system as Record<string, unknown>).details as Record<string, unknown>).level = 17;
    const result = useActorData(actor, { data: [] });
    expect(result.combat.profBonus).toBe(6);
  });

  it('computes skill list with correct totals', () => {
    const result = useActorData(makeActor(), { data: [] });
    const acr = result.skills.find((s) => s.key === 'acr');
    const ath = result.skills.find((s) => s.key === 'ath');
    const prc = result.skills.find((s) => s.key === 'prc');

    expect(acr).toBeDefined();
    // acrobatics (dex) not proficient: just dex mod = 2
    expect(acr!.total).toBe(2);
    expect(acr!.proficient).toBe(false);

    expect(ath).toBeDefined();
    // athletics (str) proficient (value=2): str mod(3) + profBonus(3)*2 = 9
    expect(ath!.total).toBe(9);
    expect(ath!.proficient).toBe(true);

    expect(prc).toBeDefined();
    // perception (wis) proficient (value=1): wis mod(1) + profBonus(3)*1 = 4
    expect(prc!.total).toBe(4);
    expect(prc!.proficient).toBe(true);
  });

  it('computes saving throws correctly', () => {
    const actor = makeActor();
    // Make str proficient for its save (via proficient[0] pattern)
    ((actor.data.system as Record<string, unknown>).abilities as Record<string, unknown>).str = {
      value: 16,
      proficient: [true],
    };
    const result = useActorData(actor, { data: [] });
    const strSave = result.saves.find((s) => s.ability === 'str');
    expect(strSave).toBeDefined();
    expect(strSave!.proficient).toBe(true);
    // str proficient: mod(3) + profBonus(3) = 6
    expect(strSave!.bonus).toBe(6);
  });

  it('filters items by type', () => {
    const items: FoundryItem[] = [
      {
        _id: '1',
        name: 'Longsword',
        type: 'weapon',
        system: {} as Record<string, unknown>,
      },
      {
        _id: '2',
        name: 'Chain Mail',
        type: 'equipment',
        system: { armor: { value: 16 }, type: { value: 'heavy' } } as Record<string, unknown>,
      },
      {
        _id: '3',
        name: 'Potion of Healing',
        type: 'consumable',
        system: {} as Record<string, unknown>,
      },
      {
        _id: '4',
        name: 'Backpack',
        type: 'container',
        system: {} as Record<string, unknown>,
      },
    ];
    const actor = makeActor({ items });
    const result = useActorData(actor, { data: [] });
    expect(result.weapons).toHaveLength(1);
    expect(result.weapons[0].name).toBe('Longsword');
    expect(result.armor).toHaveLength(1);
    expect(result.armor[0].name).toBe('Chain Mail');
    expect(result.consumables).toHaveLength(1);
    expect(result.consumables[0].name).toBe('Potion of Healing');
  });

  it('computes spell slots correctly', () => {
    const result = useActorData(makeActor(), { data: [] });
    expect(result.spellSlots).toEqual([
      { level: 1, current: 4, max: 4 },
      { level: 2, current: 3, max: 3 },
      { level: 3, current: 2, max: 2 },
      { level: 4, current: 0, max: 0 },
      { level: 5, current: 0, max: 0 },
      { level: 6, current: 0, max: 0 },
      { level: 7, current: 0, max: 0 },
      { level: 8, current: 0, max: 0 },
      { level: 9, current: 0, max: 0 },
    ]);
  });

  it('parses currency correctly', () => {
    const result = useActorData(makeActor(), { data: [] });
    expect(result.currency).toEqual({ pp: 5, gp: 100, ep: 0, sp: 45, cp: 12 });
  });

  it('handles currency as nested object (number property)', () => {
    const actor = makeActor();
    ((actor.data.system as Record<string, unknown>).currency as Record<string, unknown>) = {
      gp: { number: 150 },
      sp: { number: 25 },
    };
    const result = useActorData(actor, { data: [] });
    expect(result.currency.gp).toBe(150);
    expect(result.currency.sp).toBe(25);
    expect(result.currency.pp).toBe(0);
  });

  it('extracts traits: damage resist, condition immune, languages, senses', () => {
    const result = useActorData(makeActor(), { data: [] });
    expect(result.traits.dr).toEqual(['slashing']);
    expect(result.traits.drCustom).toBe('fire 5');
    expect(result.traits.ci).toEqual(['frightened']);
    expect(result.traits.languages).toEqual(['Common', 'Elvish']);
    expect(result.traits.senses).toBe('Normal');
  });

  it('builds senses string when darkvision present', () => {
    const actor = makeActor();
    ((actor.data.system as Record<string, unknown>).attributes as Record<string, unknown>).senses =
      {
        darkvision: 60,
      };
    const result = useActorData(actor, { data: [] });
    expect(result.traits.senses).toBe('Darkvision 60ft');
  });

  it('builds combined senses string', () => {
    const actor = makeActor();
    ((actor.data.system as Record<string, unknown>).attributes as Record<string, unknown>).senses =
      {
        darkvision: 60,
        blindsight: 30,
      };
    const result = useActorData(actor, { data: [] });
    expect(result.traits.senses).toBe('Darkvision 60ft, Blindsight 30ft');
  });

  it('extracts resources from primary resource', () => {
    const result = useActorData(makeActor(), { data: [] });
    expect(result.traits.resources).toHaveLength(1);
    expect(result.traits.resources[0].label).toBe('Second Wind');
    expect(result.traits.resources[0].value).toBe(2);
    expect(result.traits.resources[0].max).toBe(3);
    expect(result.traits.resources[0].sr).toBe(true);
    expect(result.traits.resources[0].lr).toBe(false);
  });

  it('returns empty resources when primary has no max', () => {
    const actor = makeActor();
    ((actor.data.system as Record<string, unknown>).resources as Record<string, unknown>) = {
      primary: { value: 0, max: 0 },
    };
    const result = useActorData(actor, { data: [] });
    expect(result.traits.resources).toHaveLength(0);
  });

  it('returns effects from effectsData.data array', () => {
    const effects: FoundryEffect[] = [
      { _id: 'e1', name: 'Bless', disabled: false, changes: [] },
      { _id: 'e2', name: 'Haste', disabled: false, changes: [] },
    ];
    const result = useActorData(makeActor(), { data: effects });
    expect(result.effects).toHaveLength(2);
    expect(result.effects[0].name).toBe('Bless');
  });

  it('returns effects from effectsData.data.effects array (nested format)', () => {
    const result = useActorData(makeActor(), {
      data: { effects: [{ _id: 'e1', name: 'Shield', disabled: false, changes: [] }] },
    });
    expect(result.effects).toHaveLength(1);
    expect(result.effects[0].name).toBe('Shield');
  });

  it('returns empty effects for null effectsData', () => {
    const result = useActorData(makeActor(), { data: null });
    expect(result.effects).toEqual([]);
  });

  it('handles empty actor data gracefully', () => {
    const result = useActorData({ data: {} }, { data: [] });
    expect(result.identity.name).toBe('');
    expect(result.identity.level).toBe(0);
    expect(result.hp).toEqual({ value: 0, max: 1, temp: 0, pct: 0 });
    expect(result.combat.profBonus).toBe(1);
    expect(result.weapons).toEqual([]);
    expect(result.currency).toEqual({ pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 });
    expect(result.effects).toEqual([]);
  });

  it('computes item sections correctly', () => {
    const items: FoundryItem[] = [
      { _id: 'g1', name: 'Rope', type: 'equipment', system: {} as Record<string, unknown> },
      { _id: 't1', name: 'Thieves Tools', type: 'tool', system: {} as Record<string, unknown> },
      { _id: 't2', name: 'Herbalism Kit', type: 'tool', system: {} as Record<string, unknown> },
      { _id: 'l1', name: 'Gem', type: 'loot', system: {} as Record<string, unknown> },
      { _id: 'f1', name: 'Alert', type: 'feat', system: {} as Record<string, unknown> },
    ];
    const result = useActorData(makeActor({ items }), { data: [] });
    expect(result.itemSections.length).toBeGreaterThan(0);
    const tools = result.itemSections.find((s) => s.label === 'Tools');
    expect(tools).toBeDefined();
    expect(tools!.items).toHaveLength(2);
  });

  it('extracts item-level embedded effects (item.system.effects)', () => {
    const items: FoundryItem[] = [
      {
        _id: 'i1',
        name: 'Arcane Grimoire',
        type: 'equipment',
        system: {
          effects: {
            ef1: {
              label: 'Spell Attack Bonus',
              changes: [{ key: 'system.attributes.spellcasting', value: '+1', mode: 2 }],
              disabled: false,
            },
          },
        } as Record<string, unknown>,
      },
    ];
    const result = useActorData(makeActor({ items }), { data: [] });
    expect(result.itemEffects).toHaveLength(1);
    expect(result.itemEffects[0].label).toBe('Spell Attack Bonus');
    expect(result.itemEffects[0].origin).toBe('Arcane Grimoire');
  });

  it('extracts item-level effects from item.effects array', () => {
    const items: FoundryItem[] = [
      {
        _id: 'i1',
        name: 'Flame Tongue',
        type: 'weapon',
        effects: [
          {
            _id: 'ef1',
            name: 'Fire Damage',
            changes: [{ key: 'system.damage', value: '2d6', mode: 2 }],
            disabled: false,
          },
        ] as unknown as FoundryEffect[],
        system: {} as Record<string, unknown>,
      },
    ];
    const result = useActorData(makeActor({ items }), { data: [] });
    expect(result.itemEffects).toHaveLength(1);
    expect(result.itemEffects[0].label).toBe('Fire Damage');
    expect(result.itemEffects[0].origin).toBe('Flame Tongue');
  });

  it('returns raw data for inline display', () => {
    const result = useActorData(makeActor(), { data: [] });
    expect(result.raw.abilities).toBeDefined();
    expect(result.raw.system).toBeDefined();
    expect(result.raw.details).toBeDefined();
    expect(result.raw.skills).toBeDefined();
    expect(result.raw.spells).toBeDefined();
    expect(result.raw.traits).toBeDefined();
    expect(result.raw.resources).toBeDefined();
  });
});

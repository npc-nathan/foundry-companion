'use client';

import type { FoundryItem, FoundryEffect, ItemEmbeddedEffect } from './types';
import type { ActorData } from './types';
import { getMod, SKILL_LABELS, SKILL_ABILITIES, ABILITY_NAMES } from './types';

/**
 * Hook that takes raw actor data + effects and returns typed, memoized ActorData.
 *
 * This is a pure-syntax extraction: every variable binding mirrors exactly what
 * CharacterSheetInner was doing inline. No logic changes.
 */
export function useActorData(
  actorData: { data?: Record<string, unknown> },
  effectsData: { data?: FoundryEffect[] | { uuid: string; effects: FoundryEffect[] } },
): ActorData {
  const actor = (actorData?.data || {}) as Record<string, unknown>;
  const system = (actor?.system || {}) as Record<string, unknown>;

  const hp =
    ((system?.attributes as Record<string, unknown> | undefined)?.hp as
      | Record<string, unknown>
      | undefined) || {};
  const abilities = (system?.abilities as Record<string, unknown> | undefined) || {};
  const details = (system?.details as Record<string, unknown> | undefined) || {};
  const ac =
    ((system?.attributes as Record<string, unknown> | undefined)?.ac as
      | Record<string, unknown>
      | undefined) || {};
  const init =
    ((system?.attributes as Record<string, unknown> | undefined)?.init as
      | Record<string, unknown>
      | undefined) || {};
  const movement =
    ((system?.attributes as Record<string, unknown> | undefined)?.movement as
      | Record<string, unknown>
      | undefined) || {};
  const items = (actor?.items as FoundryItem[] | undefined) || [];
  const spells = (system?.spells as Record<string, unknown> | undefined) || {};
  const skills = (system?.skills as Record<string, unknown> | undefined) || {};
  const resources = (system?.resources as Record<string, unknown> | undefined) || {};
  const traits = (system?.traits as Record<string, unknown> | undefined) || {};
  const currency = (system?.currency as Record<string, unknown> | undefined) || {};

  // ── Identity ──
  const identity = {
    name: String(actor.name || ''),
    img: (actor?.img as string | null) || null,
    race: (details?.race as string | null) || null,
    class: (details?.class as string | null) || null,
    level: (details?.level as number) || 0,
    background: (details?.background as string | null) || null,
    alignment: (details?.alignment as string | null) || null,
    size: (traits?.size as string | null) || null,
  };

  // ── HP ──
  const hpValue = typeof hp.value === 'number' ? hp.value : 0;
  const hpMax = typeof hp.max === 'number' ? hp.max : 1;
  const hpTemp = typeof hp.temp === 'number' ? hp.temp : 0;
  const pct = Math.round((hpValue / hpMax) * 100);

  // ── Combat Stats ──
  const profBonus = Math.min(6, Math.ceil(((details?.level as number) || 0) / 4) + 1);
  const acValue = buildAcValue(ac, abilities, items);
  const initBonus = buildInitBonus(init, abilities);
  const speed = String(movement?.walk ?? '?');
  const xpVal =
    ((details?.xp as Record<string, unknown> | undefined)?.value as number | undefined) ?? null;

  // ── Abilities ──
  const abilityMap: Record<string, { value: number; mod: number; proficient: boolean }> = {};
  for (const ab of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) {
    const abil = (abilities[ab] as Record<string, unknown> | undefined) || {};
    const val = (abil?.value as number) ?? 10;
    const prof = abil?.proficient as unknown;
    const proficient = Array.isArray(prof) ? !!prof[0] : !!prof;
    abilityMap[ab] = { value: val, mod: getMod(val), proficient };
  }

  // ── Skills ──
  const skillList = Object.entries(SKILL_LABELS).map(([key, label]) => {
    // eslint-disable-next-line security/detect-object-injection
    const skill = (skills?.[key] as Record<string, unknown>) || {};
    const prof = (skill?.value as number) ?? 0;
    // eslint-disable-next-line security/detect-object-injection
    const abil = SKILL_ABILITIES[key] || 'dex';
    const abilObj = abilities[abil] as Record<string, unknown> | undefined;
    const abilMod = getMod((abilObj?.value as number) || 10);
    const total = prof > 0 ? abilMod + profBonus * prof : abilMod;
    return { key, label, ability: abil, total, proficient: prof > 0, profValue: prof };
  });

  // ── Saving Throws ──
  const saveList = ['str', 'dex', 'con', 'int', 'wis', 'cha'].map((ab) => {
    const abil = (abilities[ab] as Record<string, unknown>) || {};
    const abilMod = getMod((abil?.value as number) ?? 10);
    const proficientObj = (abil as Record<string, unknown>)?.save as
      | Record<string, unknown>
      | undefined;
    const proficient =
      !!((abil as Record<string, unknown>)?.proficient as unknown[])?.[0] ||
      !!(abil as Record<string, unknown>)?.proficient ||
      !!proficientObj?.proficient;
    const saveVal = proficientObj?.value;
    const bonus: number =
      typeof saveVal === 'number' ? saveVal : proficient ? abilMod + profBonus : abilMod;
    const label = ABILITY_NAMES[ab] || ab.toUpperCase();
    return { ability: ab, label, bonus, proficient };
  });

  // ── Item filtering ──
  const weapons = items.filter((i: FoundryItem) => i?.type === 'weapon');
  const armorItems = items.filter(
    (i: FoundryItem) =>
      (i?.type === 'equipment' &&
        (
          (i?.system as Record<string, unknown> | undefined)?.armor as
            | Record<string, unknown>
            | undefined
        )?.value) ||
      ['heavy', 'medium', 'light', 'shield'].includes(
        ((
          (i?.system as Record<string, unknown> | undefined)?.type as
            | Record<string, unknown>
            | undefined
        )?.value as string) || '',
      ),
  );
  const consumables = items.filter((i: FoundryItem) => i?.type === 'consumable');
  const spellItems = items.filter((i: FoundryItem) => i?.type === 'spell');
  const otherItems = items.filter(
    (i: FoundryItem) =>
      !weapons.includes(i) &&
      !armorItems.includes(i) &&
      !consumables.includes(i) &&
      !spellItems.includes(i),
  );

  const featItems = otherItems.filter((i: FoundryItem) => i?.type === 'feat');
  const toolItems = otherItems.filter((i: FoundryItem) => i?.type === 'tool');
  const lootItems = otherItems.filter((i: FoundryItem) => i?.type === 'loot');
  const containerItems = otherItems.filter(
    (i: FoundryItem) => i?.type === 'container' || i?.type === 'backpack',
  );
  const gearItems = otherItems.filter(
    (i: FoundryItem) => i?.type === 'equipment' && !armorItems.includes(i),
  );
  const miscItems = otherItems.filter(
    (i: FoundryItem) =>
      !featItems.includes(i) &&
      !toolItems.includes(i) &&
      !lootItems.includes(i) &&
      !containerItems.includes(i) &&
      !gearItems.includes(i),
  );

  // ── Item Sections (icon mapping: just names — component maps to actual icons) ──
  const rawItemSections: { label: string; items: FoundryItem[]; iconName: string }[] = [
    { label: 'Adventuring Gear', items: gearItems, iconName: 'Backpack' },
    { label: 'Tools', items: toolItems, iconName: 'Swords' },
    { label: 'Loot & Treasure', items: lootItems, iconName: 'ScrollText' },
    { label: 'Features & Feats', items: featItems, iconName: 'Sparkles' },
    { label: 'Containers', items: containerItems, iconName: 'Backpack' },
    { label: 'Other Items', items: miscItems, iconName: 'Swords' },
  ].filter((s) => s.items.length > 0);

  // ── Currency ──
  const currencyData = {
    pp: resolveCurrency(currency?.pp),
    gp: resolveCurrency(currency?.gp),
    ep: resolveCurrency(currency?.ep),
    sp: resolveCurrency(currency?.sp),
    cp: resolveCurrency(currency?.cp),
  };

  // ── Spell Slots ──
  const spellSlotsData = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
    const slotKey = `spell${lvl}`;
    // eslint-disable-next-line security/detect-object-injection
    const slot = spells[slotKey] as Record<string, unknown> | undefined;
    return {
      level: lvl,
      current: (slot?.value as number) ?? 0,
      max: (slot?.max as number) ?? (slot?.value as number) ?? 0,
    };
  });

  // ── Traits ──
  const traitsValue = {
    biography:
      ((details?.biography as Record<string, unknown> | undefined)?.value as string | null) ?? null,
    dr: ((traits?.dr as Record<string, unknown> | undefined)?.value as string[]) || [],
    drCustom:
      ((traits?.dr as Record<string, unknown> | undefined)?.custom as string | null) ?? null,
    ci: ((traits?.ci as Record<string, unknown> | undefined)?.value as string[]) || [],
    languages:
      ((traits?.languages as Record<string, unknown> | undefined)?.value as string[]) || [],
    languagesCustom:
      ((traits?.languages as Record<string, unknown> | undefined)?.custom as string | null) ?? null,
    senses: buildSensesString(system),
    resources: [
      ...(((resources?.primary as Record<string, unknown> | undefined)?.max as number) > 0
        ? [
            {
              label: String((resources.primary as Record<string, unknown>).label || 'Resource'),
              value: (resources.primary as Record<string, unknown>).value as number,
              max: (resources.primary as Record<string, unknown>).max as number,
              sr: !!((resources.primary as Record<string, unknown>).sr as boolean),
              lr: !!((resources.primary as Record<string, unknown>).lr as boolean),
            },
          ]
        : []),
    ],
  };

  // ── Item-level effects ───────────────────────────────────────────────────────
  // Items can have embedded effects (e.g. "Spell Attack Bonus" on a grimoire).
  // Foundry stores these in item.system.effects (object record) or item.effects (array).
  const itemEffects: ItemEmbeddedEffect[] = items.flatMap((item: FoundryItem) => {
    const itemName = item.name || 'Unknown Item';
    const collected: ItemEmbeddedEffect[] = [];
    const itemSys = item?.system as Record<string, unknown> | undefined;

    // Check item.system.effects (object record of effects)
    if (itemSys?.effects && typeof itemSys.effects === 'object') {
      const eMap = itemSys.effects as Record<string, unknown>;
      for (const key of Object.keys(eMap)) {
        const ef = eMap[key] as Record<string, unknown> | undefined;
        if (!ef) continue;
        const efLabel = (ef?.label as string) || key;
        const efChanges = ef?.changes as
          | Array<{ key: string; value: string; mode?: number }>
          | undefined;
        if (efChanges && Array.isArray(efChanges) && efChanges.length > 0) {
          collected.push({
            label: efLabel,
            changes: efChanges as { key: string; value: string; mode?: number }[],
            disabled: (ef?.disabled as boolean) ?? false,
            icon: (ef?.icon as string) || undefined,
            origin: itemName,
            duration: ef?.duration as { rounds?: number } | undefined,
          });
        }
      }
    }

    // Check item.effects (array of FoundryEffect-like objects, Foundry Collection)
    // The effects property on a Foundry document is typically a Map/Collection
    // serializable as an array of effect documents
    const itemEffectArr = (item as Record<string, unknown>)?.effects as unknown[] | undefined;
    if (Array.isArray(itemEffectArr)) {
      for (const ef of itemEffectArr) {
        const efObj = ef as Record<string, unknown>;
        const efLabel = (efObj?.name as string) || (efObj?.label as string) || 'Effect';
        const efChanges = efObj?.changes as
          | Array<{ key: string; value: string; mode?: number }>
          | undefined;
        if (efChanges && Array.isArray(efChanges) && efChanges.length > 0) {
          collected.push({
            label: efLabel,
            changes: efChanges as { key: string; value: string; mode?: number }[],
            disabled: (efObj?.disabled as boolean) ?? false,
            icon: (efObj?.icon as string) || undefined,
            origin: itemName,
            duration: efObj?.duration as { rounds?: number } | undefined,
          });
        }
      }
    }

    return collected;
  });

  return {
    identity,
    hp: { value: hpValue, max: hpMax, temp: hpTemp, pct },
    combat: { acValue, initBonus, profBonus, speed, xp: xpVal },
    abilities: abilityMap,
    skills: skillList,
    saves: saveList,
    weapons,
    armor: armorItems,
    consumables,
    itemSections: rawItemSections as ActorData['itemSections'],
    currency: currencyData,
    spellSlots: spellSlotsData,
    spellItems,
    traits: traitsValue,
    effects: Array.isArray(effectsData?.data)
      ? (effectsData.data as FoundryEffect[])
      : Array.isArray((effectsData?.data as Record<string, unknown> | undefined)?.effects)
        ? ((effectsData.data as Record<string, unknown>).effects as FoundryEffect[])
        : [],
    itemEffects,
    raw: { abilities: abilities, system, details, skills, traits, spells, resources },
  };
}

/* ── Internal helpers ─────────────────────────────────────────────────────── */

function buildAcValue(
  ac: Record<string, unknown>,
  abilities: Record<string, unknown>,
  items: FoundryItem[],
): number {
  if (typeof ac.value === 'number') return ac.value;
  if (typeof ac.flat === 'number') return ac.flat;

  const dexMod = getMod(
    ((abilities?.dex as Record<string, unknown> | undefined)?.value as number) ?? 10,
  );

  const equippedArmor = items
    .filter((i: FoundryItem) => {
      const iSys = i?.system as Record<string, unknown> | undefined;
      const armor = iSys?.armor as Record<string, unknown> | undefined;
      const rawVal = armor?.value;
      const baseAC = rawVal != null ? Number(rawVal) : NaN;
      const typeVal = iSys?.type as Record<string, unknown> | undefined;
      const armorTypeVal = typeVal?.value;
      return (
        i.type === 'equipment' &&
        armorTypeVal &&
        armorTypeVal !== 'shield' &&
        iSys?.equipped !== false &&
        !isNaN(baseAC) &&
        baseAC > 0
      );
    })
    .sort((a: FoundryItem, b: FoundryItem) => {
      const aSys = a?.system as Record<string, unknown> | undefined;
      const bSys = b?.system as Record<string, unknown> | undefined;
      const aArmor = aSys?.armor as Record<string, unknown> | undefined;
      const bArmor = bSys?.armor as Record<string, unknown> | undefined;
      return (Number(bArmor?.value) ?? 0) - (Number(aArmor?.value) ?? 0);
    });

  if (equippedArmor.length > 0) {
    const best = equippedArmor[0];
    const bestSys = best?.system as Record<string, unknown> | undefined;
    const bestArmor = bestSys?.armor as Record<string, unknown> | undefined;
    const baseAC = Number(bestArmor?.value) || 0;
    const bestType = bestSys?.type as Record<string, unknown> | undefined;
    const armorType = bestType?.value;
    let dexCap: number | null = null;
    if (armorType === 'heavy') dexCap = 0;
    else if (armorType === 'medium') {
      const dexVal = bestArmor?.dex as number | undefined;
      dexCap = Math.min(2, dexVal ?? 2);
    }
    const dexContrib = dexCap !== null ? Math.min(dexMod, dexCap) : dexMod;
    let total = baseAC + dexContrib;
    const hasShield = items.some((i: FoundryItem) => {
      const iSys = i?.system as Record<string, unknown> | undefined;
      const iType = iSys?.type as Record<string, unknown> | undefined;
      return iType?.value === 'shield' && iSys?.equipped !== false;
    });
    if (hasShield) total += 2;
    return total;
  }

  if (ac.calc === 'natural' || ac.calc === 'default') return 10 + dexMod;
  if (typeof (ac as Record<string, unknown>).armor === 'object') {
    const acArmor = (ac as Record<string, unknown>).armor as Record<string, unknown>;
    if (typeof acArmor.value === 'number') return (acArmor.value as number) + dexMod;
  }
  return 10 + dexMod;
}

function buildInitBonus(init: Record<string, unknown>, abilities: Record<string, unknown>): number {
  const raw = init.bonus;
  if (raw !== undefined && raw !== null && raw !== '') return Number(raw);
  if (init.total !== undefined && init.total !== null && init.total !== '')
    return Number(init.total);
  if (init.mod !== undefined && init.mod !== null && init.mod !== '') return Number(init.mod);
  return getMod(((abilities?.dex as Record<string, unknown> | undefined)?.value as number) ?? 10);
}

function buildSensesString(system: Record<string, unknown>): string {
  const senses = (system?.attributes as Record<string, unknown>)?.senses as
    | Record<string, unknown>
    | undefined;
  if (!senses) return 'Normal';
  const parts: string[] = [];
  if ((senses.darkvision as number) > 0) parts.push(`Darkvision ${String(senses.darkvision)}ft`);
  if ((senses.blindsight as number) > 0) parts.push(`Blindsight ${String(senses.blindsight)}ft`);
  if ((senses.truesight as number) > 0) parts.push(`Truesight ${String(senses.truesight)}ft`);
  if ((senses.tremorsense as number) > 0) parts.push(`Tremorsense ${String(senses.tremorsense)}ft`);
  return parts.length > 0 ? parts.join(', ') : 'Normal';
}

function resolveCurrency(val: unknown): number {
  if (val && typeof val === 'object')
    return ((val as Record<string, unknown>).number ?? 0) as number;
  return (val ?? 0) as number;
}

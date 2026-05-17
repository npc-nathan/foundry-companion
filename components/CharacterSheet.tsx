'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relay } from '@/lib/relay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  Heart,
  Shield,
  Swords,
  Zap,
  Footprints,
  Backpack,
  BookOpen,
  Sparkles,
  Sword,
  Crosshair,
  ScrollText,
} from 'lucide-react';

/* ── Foundry API type helpers ─────────────────────────────────────────────── */

/** A generic object representing a Foundry item or spell document (partial). */
interface FoundryDoc {
  _id?: string;
  name?: string;
  type?: string;
  img?: string;
  uuid?: string;
  system?: Record<string, unknown>;
}

/** A Foundry document with known spell-like system fields. */
interface FoundryItem extends FoundryDoc {
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
interface FoundryEffect {
  _id?: string;
  name?: string;
  label?: string;
  icon?: string;
  statuses?: string[];
  changes?: { key: string; value: string }[];
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function getMod(val: number): number {
  return Math.floor((val - 10) / 2);
}

function hpColor(pct: number): string {
  if (pct > 50) return 'bg-green-500';
  if (pct > 20) return 'bg-yellow-500';
  return 'bg-red-500';
}

function buildDamageFormula(item: FoundryItem): string {
  const system = item?.system;
  const damage = system?.damage as Record<string, unknown> | undefined;
  const base = damage?.base as Record<string, unknown> | undefined;
  if (!base) return '';
  const num = (base.number as number) || 1;
  const denom = (base.denomination as number) || 4;
  const bonus = base.bonus ? `+${String(base.bonus)}` : '';
  return `${num}d${denom}${bonus}`;
}

function formatVersatile(versatile: unknown): string {
  if (!versatile) return '';
  if (typeof versatile === 'string') return `(${versatile})`;
  if (typeof versatile !== 'object') return '';
  const v = versatile as Record<string, unknown>;
  const num = (v.number as number) || 1;
  const denom = (v.denomination as number) || 0;
  const bonus = v.bonus ? `+${String(v.bonus)}` : '';
  return denom > 0 ? `(${num}d${denom}${bonus})` : '';
}

function formatDetailField(v: unknown): string {
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

function itemIcon(type: string) {
  switch (type) {
    case 'weapon':
      return <Sword className="h-4 w-4" />;
    case 'armor':
      return <Shield className="h-4 w-4" />;
    case 'equipment':
      return <Backpack className="h-4 w-4" />;
    case 'consumable':
      return <Zap className="h-4 w-4" />;
    case 'tool':
      return <Swords className="h-4 w-4" />;
    case 'loot':
      return <ScrollText className="h-4 w-4" />;
    case 'feat':
      return <Sparkles className="h-4 w-4" />;
    case 'container':
    case 'backpack':
      return <Backpack className="h-4 w-4" />;
    default:
      return <Swords className="h-4 w-4" />;
  }
}

function itemSubtitle(item: FoundryItem): string {
  const parts: string[] = [];
  if (item.type === 'weapon') {
    const dmg = buildDamageFormula(item);
    if (dmg) parts.push(dmg);
    const system = item?.system as Record<string, unknown> | undefined;
    const props = (system?.properties as unknown[] | undefined) || [];
    const names = props
      .map((p: unknown) =>
        typeof p === 'string' ? p : ((p as Record<string, unknown>)?.name as string) || '',
      )
      .filter(Boolean);
    if (names.length) parts.push(names.join(', '));
    return parts.join(' • ');
  }
  const itemSys = item?.system as Record<string, unknown> | undefined;
  if (item.type === 'equipment') {
    const armor = itemSys?.armor as Record<string, unknown> | undefined;
    const typeVal = itemSys?.type as Record<string, unknown> | undefined;
    if (armor?.value) {
      return `AC ${String(armor.value)}${typeVal?.value ? ` • ${String(typeVal.value)}` : ''}`;
    }
  }
  if (itemSys?.quantity) return `x${String(itemSys.quantity)}`;
  return '';
}

const ABILITY_NAMES: Record<string, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

const SKILL_LABELS: Record<string, string> = {
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

const SKILL_ABILITIES: Record<string, string> = {
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

function CharacterSheetInner({
  actorData,
  effectsData,
  uuid,
}: {
  actorData: { data?: Record<string, unknown> };
  effectsData: { data?: FoundryEffect[] };
  uuid: string;
}) {
  const queryClient = useQueryClient();
  const [damage, setDamage] = useState('');
  const [heal, setHeal] = useState('');
  const [detailItem, setDetailItem] = useState<FoundryItem | null>(null);
  const [rolling, setRolling] = useState<string | null>(null);
  const [, setLastRollResult] = useState<{ label: string; total: number } | null>(null);

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

  const hpValue = typeof hp.value === 'number' ? hp.value : 0;
  const hpMax = typeof hp.max === 'number' ? hp.max : 1;
  const hpTemp = typeof hp.temp === 'number' ? hp.temp : 0;
  const pct = Math.round((hpValue / hpMax) * 100);
  const profBonus = Math.min(6, Math.ceil(((details?.level as number) || 0) / 4) + 1);

  const acValue = (() => {
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
  })();

  const initBonus = (() => {
    const raw = init.bonus;
    if (raw !== undefined && raw !== null && raw !== '') return Number(raw);
    if (init.total !== undefined && init.total !== null && init.total !== '')
      return Number(init.total);
    if (init.mod !== undefined && init.mod !== null && init.mod !== '') return Number(init.mod);
    return getMod(((abilities?.dex as Record<string, unknown> | undefined)?.value as number) ?? 10);
  })();

  // Filter items
  const weapons = items.filter((i: FoundryItem) => i?.type === 'weapon');
  const armor = items.filter(
    (i: FoundryItem) =>
      (i?.type === 'equipment' &&
        (
          (i?.system as Record<string, unknown> | undefined)?.armor as
            | Record<string, unknown>
            | undefined
        )?.value) ||
      ['heavy', 'medium', 'light', 'shield'].includes(
        (
          (i?.system as Record<string, unknown> | undefined)?.type as
            | Record<string, unknown>
            | undefined
        )?.value as string,
      ),
  );
  const consumables = items.filter((i: FoundryItem) => i?.type === 'consumable');
  const spellItems = items.filter((i: FoundryItem) => i?.type === 'spell');
  const otherItems = items.filter(
    (i: FoundryItem) =>
      !weapons.includes(i) &&
      !armor.includes(i) &&
      !consumables.includes(i) &&
      !spellItems.includes(i),
  );

  // Group other items by type
  const featItems = otherItems.filter((i: FoundryItem) => i?.type === 'feat');
  const toolItems = otherItems.filter((i: FoundryItem) => i?.type === 'tool');
  const lootItems = otherItems.filter((i: FoundryItem) => i?.type === 'loot');
  const containerItems = otherItems.filter(
    (i: FoundryItem) => i?.type === 'container' || i?.type === 'backpack',
  );
  const gearItems = otherItems.filter(
    (i: FoundryItem) => i?.type === 'equipment' && !armor.includes(i),
  );
  const miscItems = otherItems.filter(
    (i: FoundryItem) =>
      !featItems.includes(i) &&
      !toolItems.includes(i) &&
      !lootItems.includes(i) &&
      !containerItems.includes(i) &&
      !gearItems.includes(i),
  );

  const itemSections = [
    {
      label: 'Adventuring Gear',
      items: gearItems,
      icon: <Backpack className="h-4 w-4 text-amber-400" />,
    },
    { label: 'Tools', items: toolItems, icon: <Swords className="h-4 w-4 text-cyan-400" /> },
    {
      label: 'Loot & Treasure',
      items: lootItems,
      icon: <ScrollText className="h-4 w-4 text-green-400" />,
    },
    {
      label: 'Features & Feats',
      items: featItems,
      icon: <Sparkles className="h-4 w-4 text-emerald-400" />,
    },
    {
      label: 'Containers',
      items: containerItems,
      icon: <Backpack className="h-4 w-4 text-orange-400" />,
    },
    {
      label: 'Other Items',
      items: miscItems,
      icon: <Swords className="h-4 w-4 text-muted-foreground" />,
    },
  ].filter((s) => s.items.length > 0);

  const spellSlots = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
    const slotKey = `spell${lvl}`;
    // eslint-disable-next-line security/detect-object-injection
    const slot = spells[slotKey] as Record<string, unknown> | undefined;
    return {
      level: lvl,
      current: (slot?.value as number) ?? 0,
      max: (slot?.max as number) ?? (slot?.value as number) ?? 0,
    };
  });

  // Mutations
  const damageMutation = useMutation({
    mutationFn: (amount: number) => relay.decrease(uuid, 'system.attributes.hp.value', amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actor', uuid] });
      setDamage('');
      toast.success(`Applied ${damage} damage`);
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const healMutation = useMutation({
    mutationFn: (amount: number) => relay.increase(uuid, 'system.attributes.hp.value', amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actor', uuid] });
      setHeal('');
      toast.success(`Healed for ${heal}`);
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const shortRestMutation = useMutation({
    mutationFn: () => relay.dndShortRest({ actorUuid: uuid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actor', uuid] });
      toast.success('Short rest completed!');
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const longRestMutation = useMutation({
    mutationFn: () => relay.dndLongRest({ actorUuid: uuid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actor', uuid] });
      toast.success('Long rest completed!');
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const deathSaveMutation = useMutation({
    mutationFn: () => relay.dndDeathSave({ actorUuid: uuid, createChatMessage: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actor', uuid] });
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const equipMutation = useMutation({
    mutationFn: (params: { itemUuid?: string; itemName?: string; equipped: boolean }) =>
      relay.dndEquipItem({ actorUuid: uuid, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actor', uuid] });
      toast.success('Equipment updated');
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const attuneMutation = useMutation({
    mutationFn: (params: { itemName: string; attuned: boolean }) =>
      relay.dndAttuneItem({ actorUuid: uuid, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actor', uuid] });
      toast.success('Attunement updated');
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const prepareSpellMutation = useMutation({
    mutationFn: (params: { spellName: string; prepared: boolean }) =>
      relay.dndPrepareSpell({ actorUuid: uuid, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actor', uuid] });
      toast.success('Spell preparation updated');
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const abilityCheckMutation = useMutation({
    mutationFn: (ability: string) =>
      relay.dndAbilityCheck({ actorUuid: uuid, ability, createChatMessage: true }),
    onSuccess: (_data: unknown, ability: string) => {
      const d = _data as { data?: { total?: number } } | undefined;
      const total = d?.data?.total ?? '?';
      // eslint-disable-next-line security/detect-object-injection
      const label = ABILITY_NAMES[ability] || ability.toUpperCase();
      setLastRollResult({ label: `${label} Check`, total: typeof total === 'number' ? total : 0 });
      toast.success(`${label} Check: ${total}`);
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const skillCheckMutation = useMutation({
    mutationFn: (skill: string) =>
      relay.dndSkillCheck({ actorUuid: uuid, skill, createChatMessage: true }),
    onSuccess: (_data: unknown, skill: string) => {
      const d = _data as { data?: { total?: number } } | undefined;
      const total = d?.data?.total ?? '?';
      // eslint-disable-next-line security/detect-object-injection
      const label = SKILL_LABELS[skill] || skill;
      setLastRollResult({ label, total: typeof total === 'number' ? total : 0 });
      toast.success(`${label}: ${total}`);
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const doRoll = useCallback(async (label: string, formula: string) => {
    setRolling(label);
    try {
      const result = await relay.roll({ formula, createChatMessage: true });
      const r = result as
        | { data?: { roll?: { total?: number } }; roll?: { total?: number } }
        | undefined;
      const total = r?.data?.roll?.total ?? r?.roll?.total ?? '?';
      setLastRollResult({ label, total: typeof total === 'number' ? total : 0 });
      toast.success(`${label}: ${total}`);
    } catch (e) {
      toast.error(`Roll failed: ${String(e)}`);
    } finally {
      setRolling(null);
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailItem(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const detailImage = detailItem?.img
    ? `/api/relay/download?path=${encodeURIComponent(detailItem.img)}&source=data`
    : null;

  return (
    <div className="space-y-6">
      {/* Character Identity */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl font-bold overflow-hidden">
          {actor?.img && !String(actor.img).includes('mystery-man') ? (
            <Image
              src={`/api/relay/download?path=${encodeURIComponent(String(actor.img))}&source=data`}
              alt={String(actor.name || '')}
              width={56}
              height={56}
              unoptimized
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            String(actor.name || '')
              .charAt(0)
              .toUpperCase() || '?'
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold">{String(actor.name || '')}</h2>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {!!details.race && (
              <Badge variant="secondary" className="text-xs">
                {String(details.race)}
              </Badge>
            )}
            {!!details.class && (
              <Badge variant="secondary" className="text-xs">
                {String(details.class)} {String(details.level || '')}
              </Badge>
            )}
            {!details.class && !!details.background && (
              <Badge variant="secondary" className="text-xs">
                {String(details.background)}
              </Badge>
            )}
            {!!details.alignment && (
              <Badge variant="outline" className="text-xs">
                {String(details.alignment)}
              </Badge>
            )}
            {!!traits.size && (
              <Badge variant="outline" className="text-xs">
                {String(traits.size).toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* HP + Combat Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* HP */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-400" /> Hit Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {hpValue} / {hpMax}
              {hpTemp > 0 && <span className="text-sm text-blue-400 ml-2">+{hpTemp} temp</span>}
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${hpColor(pct)} transition-all duration-300 rounded-full`}
                style={{ width: `${Math.max(pct, 0)}%` }}
              />
            </div>
            <div className="flex gap-2 mt-3">
              <div className="flex-1 flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="px-2"
                  disabled={damageMutation.isPending}
                  onClick={() => damageMutation.mutate(5)}
                >
                  -5
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="px-2"
                  disabled={damageMutation.isPending}
                  onClick={() => damageMutation.mutate(1)}
                >
                  -1
                </Button>
                <input
                  type="number"
                  placeholder="DMG"
                  value={damage}
                  onChange={(e) => setDamage(e.target.value)}
                  className="flex-1 px-2 py-1 rounded border bg-background text-sm w-12 min-w-0"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!damage || damageMutation.isPending}
                  onClick={() => damageMutation.mutate(Number(damage))}
                >
                  Damage
                </Button>
              </div>
              <div className="flex-1 flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="px-2"
                  disabled={healMutation.isPending}
                  onClick={() => healMutation.mutate(1)}
                >
                  +1
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="px-2"
                  disabled={healMutation.isPending}
                  onClick={() => healMutation.mutate(5)}
                >
                  +5
                </Button>
                <input
                  type="number"
                  placeholder="HEAL"
                  value={heal}
                  onChange={(e) => setHeal(e.target.value)}
                  className="flex-1 px-2 py-1 rounded border bg-background text-sm w-12 min-w-0"
                />
                <Button
                  size="sm"
                  variant="default"
                  disabled={!heal || healMutation.isPending}
                  onClick={() => healMutation.mutate(Number(heal))}
                >
                  Heal
                </Button>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                disabled={shortRestMutation.isPending}
                onClick={() => shortRestMutation.mutate()}
              >
                {shortRestMutation.isPending ? 'Resting...' : 'Short Rest'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                disabled={longRestMutation.isPending}
                onClick={() => longRestMutation.mutate()}
              >
                {longRestMutation.isPending ? 'Resting...' : 'Long Rest'}
              </Button>
            </div>
            {hpValue <= 0 && (
              <Button
                size="sm"
                variant="destructive"
                className="w-full mt-2"
                disabled={deathSaveMutation.isPending}
                onClick={() => deathSaveMutation.mutate()}
              >
                {deathSaveMutation.isPending ? 'Rolling...' : '🛡️ Death Saving Throw'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Combat Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" /> Combat Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Armor Class</span>
              <span className="text-xl font-bold">{acValue}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Footprints className="h-3.5 w-3.5" /> Speed
              </span>
              <span className="text-xl font-bold">
                {String(movement?.walk ?? '?')}
                <span className="text-xs text-muted-foreground ml-1">ft</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Initiative</span>
              <span className="text-lg font-semibold">
                {typeof initBonus === 'number'
                  ? `${initBonus >= 0 ? '+' : ''}${initBonus}`
                  : initBonus}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Prof. Bonus</span>
              <span className="text-lg font-semibold">+{profBonus}</span>
            </div>
            {((details?.xp as Record<string, unknown> | undefined)?.value as number | undefined) !==
              undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">XP</span>
                <span className="text-sm font-mono">
                  {((details.xp as Record<string, unknown>)?.value as number)?.toLocaleString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ability Scores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" /> Ability Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {['str', 'dex', 'con', 'int', 'wis', 'cha'].map((ab) => {
              // eslint-disable-next-line security/detect-object-injection
              const abil = abilities[ab] as Record<string, unknown> | undefined;
              const val = abil?.value || 10;
              const mod = getMod(val as number);
              const proficient = abil?.proficient;
              const isRolling = rolling === `ability-${ab}`;
              return (
                <button
                  key={ab}
                  type="button"
                  disabled={isRolling || abilityCheckMutation.isPending}
                  onClick={() => abilityCheckMutation.mutate(ab)}
                  className="text-center p-3 rounded-lg bg-muted/50 border cursor-pointer hover:bg-muted/80 hover:border-primary/30 transition-colors disabled:opacity-50"
                >
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    {/* eslint-disable-next-line security/detect-object-injection */}
                    {ABILITY_NAMES[ab]}
                  </div>
                  <div className="text-2xl font-bold mt-1">{val as number}</div>
                  <div className="text-sm text-muted-foreground">{mod >= 0 ? `+${mod}` : mod}</div>
                  {proficient ? (
                    <Badge variant="outline" className="text-[9px] px-1 mt-1 h-4">
                      PRO
                    </Badge>
                  ) : null}
                  {isRolling && <div className="text-[9px] text-primary mt-0.5">Rolling...</div>}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" /> Skills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
            {Object.entries(SKILL_LABELS).map(([key, label]) => {
              // eslint-disable-next-line security/detect-object-injection
              const skill = (skills?.[key] as Record<string, unknown>) || {};
              const prof = (skill?.value as number) ?? 0;
              // eslint-disable-next-line security/detect-object-injection
              const abil = SKILL_ABILITIES[key] || 'dex';
              // eslint-disable-next-line security/detect-object-injection
              const abilObj = abilities[abil] as Record<string, unknown> | undefined;
              const abilMod = getMod((abilObj?.value as number) || 10);
              const total = prof > 0 ? abilMod + profBonus * prof : abilMod;
              const isRolling = rolling === `skill-${key}`;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isRolling || skillCheckMutation.isPending}
                  onClick={() => skillCheckMutation.mutate(key)}
                  className={`flex items-center justify-between px-3 py-1.5 rounded text-sm cursor-pointer hover:bg-muted/60 hover:border hover:border-primary/20 transition-colors disabled:opacity-50 ${prof > 0 ? 'bg-muted/40 font-medium' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    {prof > 0 && <span className="text-[10px] text-primary">●</span>}
                    {label}
                    {isRolling && <span className="text-[9px] text-primary ml-1">roll...</span>}
                  </span>
                  <span
                    className={`font-mono text-xs ${total >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {total >= 0 ? `+${total}` : total}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Saving Throws */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-400" /> Saving Throws
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {['str', 'dex', 'con', 'int', 'wis', 'cha'].map((ab) => {
              // eslint-disable-next-line security/detect-object-injection
              const abil = (abilities[ab] as Record<string, unknown>) || {};
              const abilMod = getMod((abil?.value as number) ?? 10);
              const proficient =
                !!((abil as Record<string, unknown>)?.proficient as unknown[])?.[0] ||
                !!(abil as Record<string, unknown>)?.proficient ||
                !!((abil as Record<string, unknown>)?.save as Record<string, unknown> | undefined)
                  ?.proficient;
              const save = (abil as Record<string, unknown>)?.save as
                | Record<string, unknown>
                | undefined;
              const saveVal = save?.value;
              const bonus: number =
                typeof saveVal === 'number' ? saveVal : proficient ? abilMod + profBonus : abilMod;
              // eslint-disable-next-line security/detect-object-injection
              const label = ABILITY_NAMES[ab] || ab.toUpperCase();
              const isRolling = rolling === `save-${ab}`;
              return (
                <button
                  key={ab}
                  type="button"
                  disabled={isRolling}
                  onClick={() => {
                    setRolling(`save-${ab}`);
                    relay
                      .dndAbilitySave({ actorUuid: uuid, ability: ab, createChatMessage: true })
                      .then((r: unknown) => {
                        const result = r as
                          | { data?: { total?: number; saveTotal?: number } }
                          | undefined;
                        const total = result?.data?.total ?? result?.data?.saveTotal ?? '?';
                        setLastRollResult({ label: `${label} Save`, total: total as number });
                        toast.success(`${label} Save: ${total}`);
                      })
                      .catch((e: Error) => toast.error(`Save failed: ${String(e)}`))
                      .finally(() => setRolling(null));
                  }}
                  className={`text-center p-3 rounded-lg border cursor-pointer hover:bg-muted/80 hover:border-primary/30 transition-colors disabled:opacity-50 ${proficient ? 'bg-muted/40 border-primary/20' : 'bg-muted/50 border-transparent'}`}
                >
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    {label}
                  </div>
                  <div
                    className={`text-lg font-bold mt-0.5 ${bonus >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {bonus >= 0 ? `+${bonus}` : bonus}
                  </div>
                  {proficient && <div className="text-[9px] text-primary mt-0.5">● PROF</div>}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      {items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Weapons */}
          {weapons.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sword className="h-4 w-4 text-orange-400" /> Weapons ({weapons.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {weapons.map((item: FoundryItem) => {
                  const formula = buildDamageFormula(item);
                  const isRolling = rolling === `weapon-${item.name}`;
                  const itemSys = item?.system as Record<string, unknown> | undefined;
                  const attunement = itemSys?.attunement as Record<string, unknown> | undefined;
                  const needsAttune = attunement?.required || attunement?.value !== undefined;
                  const props = itemSys?.properties as unknown[] | undefined;
                  return (
                    <div
                      key={item._id || item.name}
                      className="flex items-center justify-between p-2 rounded bg-muted/30"
                    >
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          className="font-medium text-sm hover:text-primary transition-colors cursor-pointer text-left"
                          onClick={() => setDetailItem(item)}
                        >
                          {item.name}
                        </button>
                        <div className="text-xs text-muted-foreground">
                          {formula && (
                            <button
                              type="button"
                              disabled={isRolling}
                              onClick={() => doRoll(`${item.name} damage`, formula)}
                              className="hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {formula}
                            </button>
                          )}
                          {!!itemSys?.damage &&
                            !!formatVersatile(
                              (itemSys.damage as Record<string, unknown>)?.versatile,
                            ) && (
                              <span className="ml-1">
                                {formatVersatile(
                                  (itemSys.damage as Record<string, unknown>)?.versatile,
                                )}
                              </span>
                            )}
                          {props?.length
                            ? ` • ${props
                                .map((p: unknown) =>
                                  typeof p === 'string'
                                    ? p
                                    : ((p as Record<string, unknown>)?.name as string) || '',
                                )
                                .filter(Boolean)
                                .join(', ')}`
                            : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {needsAttune && (
                          <Button
                            size="sm"
                            variant={attunement?.value ? 'default' : 'outline'}
                            className="text-[10px] h-7 px-1.5"
                            disabled={attuneMutation.isPending}
                            onClick={() =>
                              attuneMutation.mutate({
                                itemName: item.name || '',
                                attuned: !attunement?.value,
                              })
                            }
                          >
                            {attunement?.value ? 'AT' : '--'}
                          </Button>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {String(itemSys?.actionType || 'other')}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Armor */}
          {armor.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-400" /> Armor ({armor.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {armor.map((item: FoundryItem) => {
                  const itemSys = item?.system as Record<string, unknown> | undefined;
                  const armorField = itemSys?.armor as Record<string, unknown> | undefined;
                  const typeField = itemSys?.type as Record<string, unknown> | undefined;
                  return (
                    <div
                      key={item._id || item.name}
                      className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className="cursor-pointer min-w-0 flex-1"
                        onClick={() => setDetailItem(item)}
                      >
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          AC {String(armorField?.value || '?')}
                          {!!typeField?.value && ` • ${String(typeField.value)}`}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={itemSys?.equipped ? 'default' : 'outline'}
                        className="text-[10px] h-7 px-2 ml-2"
                        disabled={equipMutation.isPending}
                        onClick={() =>
                          equipMutation.mutate({
                            itemUuid: item._id || item.uuid,
                            itemName: item.name,
                            equipped: !itemSys?.equipped,
                          })
                        }
                      >
                        {itemSys?.equipped ? 'Equipped' : 'Carried'}
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Consumables */}
      {consumables.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              Consumables
              <span className="text-xs text-muted-foreground font-normal">
                ({consumables.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {consumables.map((item: FoundryItem) => (
                <div
                  key={item._id || item.name}
                  className="flex items-center gap-2 p-2 rounded bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setDetailItem(item)}
                >
                  {itemIcon(item.type || '')}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{itemSubtitle(item)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grouped Items */}
      {itemSections.map((section) => (
        <Card key={section.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {section.icon}
              {section.label}
              <span className="text-xs text-muted-foreground font-normal">
                ({section.items.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {section.items.map((item: FoundryItem) => (
                <div
                  key={item._id || item.name}
                  className="flex items-center gap-2 p-2 rounded bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setDetailItem(item)}
                >
                  {itemIcon(item.type || '')}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{itemSubtitle(item)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Currency */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Currency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'PP', value: currency?.pp as unknown, color: 'text-indigo-300' },
              { label: 'GP', value: currency?.gp as unknown, color: 'text-yellow-400' },
              { label: 'EP', value: currency?.ep as unknown, color: 'text-cyan-300' },
              { label: 'SP', value: currency?.sp as unknown, color: 'text-gray-300' },
              { label: 'CP', value: currency?.cp as unknown, color: 'text-amber-600' },
            ].map((c) => {
              const val =
                c.value && typeof c.value === 'object'
                  ? ((c.value as Record<string, unknown>).number ?? 0)
                  : (c.value ?? 0);
              return (
                <div
                  key={c.label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-muted/40"
                >
                  <span className={`text-sm font-bold ${c.color}`}>{val as number}</span>
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Spell Slots */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-400" /> Spell Slots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {spellSlots.map((s) => (
              <div
                key={s.level}
                className={`text-center p-3 rounded-lg ${s.max > 0 ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-muted/20'}`}
              >
                <div className="text-[10px] uppercase font-bold text-muted-foreground">
                  Lvl {s.level}
                </div>
                <div
                  className={`text-lg font-bold mt-0.5 ${s.max > 0 ? '' : 'text-muted-foreground/40'}`}
                >
                  {s.current}/{s.max}
                </div>
              </div>
            ))}
          </div>
          {((spells.pact as Record<string, unknown> | undefined)?.value as number) > 0 && (
            <div className="mt-2 text-center">
              <Badge variant="outline" className="text-xs">
                Pact Magic: {String((spells.pact as Record<string, unknown>).value)} slot
                {Number((spells.pact as Record<string, unknown>).value) !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spells */}
      {spellItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" /> Spells ({spellItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {spellItems.map((spell: FoundryItem) => {
                const spellSys = spell?.system as Record<string, unknown> | undefined;
                const lvl = (spellSys?.level as number) ?? 0;
                const isRolling = rolling === `spell-${spell.name}`;
                const spellAbility = (spellSys?.ability as string) || 'int';
                // eslint-disable-next-line security/detect-object-injection
                const abilObj = abilities[spellAbility] as Record<string, unknown> | undefined;
                const spellMod = (abilObj?.value as number) || 10;
                const spellAttackMod = getMod(spellMod) + profBonus;
                const prep = spellSys?.preparation as Record<string, unknown> | undefined;
                const isPrepared = (prep?.prepared as boolean) ?? true;
                const canPrepare = prep?.mode === 'prepared' || prep?.prepared !== undefined;
                return (
                  <div
                    key={spell._id || spell.name}
                    className="flex items-center gap-2 p-2 rounded bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setDetailItem(spell)}
                  >
                    {canPrepare ? (
                      <button
                        type="button"
                        disabled={prepareSpellMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          prepareSpellMutation.mutate({
                            spellName: spell.name || '',
                            prepared: !isPrepared,
                          });
                        }}
                        className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${isPrepared ? 'bg-indigo-500 border-indigo-500' : 'border-muted-foreground/40 hover:border-indigo-400'}`}
                        title={
                          isPrepared
                            ? 'Prepared (click to unprepare)'
                            : 'Not prepared (click to prepare)'
                        }
                      >
                        {isPrepared && <span className="text-[8px] text-white">✓</span>}
                      </button>
                    ) : (
                      <BookOpen className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate">{spell.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span>{lvl === 0 ? 'Cantrip' : `Lvl ${lvl}`}</span>
                        {!!spellSys?.school && <span>• {String(spellSys.school)}</span>}
                        {lvl > 0 && (
                          <button
                            type="button"
                            disabled={isRolling}
                            onClick={(e) => {
                              e.stopPropagation();
                              doRoll(
                                `${spell.name} attack`,
                                `1d20${spellAttackMod >= 0 ? '+' : ''}${spellAttackMod}`,
                              );
                            }}
                            className="text-[10px] text-primary hover:underline disabled:opacity-50"
                          >
                            {isRolling ? '...' : `+${spellAttackMod} hit`}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features & Traits */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" /> Features & Traits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!!(details?.biography as Record<string, unknown> | undefined)?.value && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                  Biography
                </h4>
                <div
                  className="text-sm prose-sm prose-invert max-w-none [&_p]:mb-1"
                  dangerouslySetInnerHTML={{
                    __html: (details.biography as Record<string, unknown>).value as string,
                  }}
                />
              </div>
            )}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                Damage Resistances
              </h4>
              <p className="text-sm">
                {((traits?.dr as Record<string, unknown> | undefined)?.value
                  ? ((traits.dr as Record<string, unknown>).value as string[])
                  : []
                ).join(', ') || 'None'}
                {!!(traits?.dr as Record<string, unknown> | undefined)?.custom &&
                  ` (${String((traits.dr as Record<string, unknown>).custom)})`}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                Condition Immunities
              </h4>
              <p className="text-sm">
                {((traits?.ci as Record<string, unknown> | undefined)?.value
                  ? ((traits.ci as Record<string, unknown>).value as string[])
                  : []
                ).join(', ') || 'None'}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                Languages
              </h4>
              <p className="text-sm">
                {((traits?.languages as Record<string, unknown> | undefined)?.value
                  ? ((traits.languages as Record<string, unknown>).value as string[])
                  : []
                ).join(', ') || 'None'}
                {!!(traits?.languages as Record<string, unknown> | undefined)?.custom &&
                  ` (${String((traits.languages as Record<string, unknown>).custom)})`}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                Senses
              </h4>
              <p className="text-sm">
                {((
                  (system?.attributes as Record<string, unknown>)?.senses as Record<string, unknown>
                )?.darkvision as number) > 0 &&
                  `Darkvision ${String(((system.attributes as Record<string, unknown>).senses as Record<string, unknown>).darkvision)}ft`}
                {((
                  (system?.attributes as Record<string, unknown>)?.senses as Record<string, unknown>
                )?.blindsight as number) > 0 &&
                  `, Blindsight ${String(((system.attributes as Record<string, unknown>).senses as Record<string, unknown>).blindsight)}ft`}
                {((
                  (system?.attributes as Record<string, unknown>)?.senses as Record<string, unknown>
                )?.truesight as number) > 0 &&
                  `, Truesight ${String(((system.attributes as Record<string, unknown>).senses as Record<string, unknown>).truesight)}ft`}
                {!(
                  (system?.attributes as Record<string, unknown>)?.senses as Record<string, unknown>
                )?.darkvision &&
                  !(
                    (system?.attributes as Record<string, unknown>)?.senses as Record<
                      string,
                      unknown
                    >
                  )?.blindsight &&
                  !(
                    (system?.attributes as Record<string, unknown>)?.senses as Record<
                      string,
                      unknown
                    >
                  )?.truesight &&
                  'Normal'}
              </p>
            </div>
            {((resources?.primary as Record<string, unknown>)?.max as number) > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                  {String((resources.primary as Record<string, unknown>).label || 'Resource')}
                </h4>
                <p className="text-sm">
                  {String((resources.primary as Record<string, unknown>).value)}/
                  {(resources.primary as Record<string, unknown>).max as number}
                  {!!(resources.primary as Record<string, unknown>).sr && ' (Short Rest)'}
                  {!!(resources.primary as Record<string, unknown>).lr && ' (Long Rest)'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Effects */}
      {effectsData?.data && Array.isArray(effectsData.data) && effectsData.data.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-400" /> Active Effects ({effectsData.data.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {effectsData.data.map((effect: FoundryEffect) => (
                <Badge
                  key={effect._id || effect.name}
                  variant="secondary"
                  className="text-xs flex items-center gap-1"
                  title={
                    (effect?.changes?.length ?? 0) > 0
                      ? effect.changes
                          ?.map((c: { key: string; value: string }) => `${c.key}: ${c.value}`)
                          .join(', ')
                      : undefined
                  }
                >
                  {(effect?.statuses?.length ?? 0) > 0 && effect?.icon && (
                    <Image
                      src={effect.icon}
                      alt=""
                      width={14}
                      height={14}
                      className="w-3.5 h-3.5"
                    />
                  )}
                  {effect.label || effect.name || 'Unknown'}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Sheet */}
      <Sheet
        open={!!detailItem}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
      >
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          {detailItem && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  {detailImage && (
                    <Image
                      src={detailImage}
                      alt={detailItem.name || ''}
                      width={40}
                      height={40}
                      unoptimized
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <SheetTitle className="text-base">{detailItem.name}</SheetTitle>
                    <SheetDescription>
                      {detailItem.type === 'spell' ? (
                        <>
                          {(detailItem.system?.level as number) === 0
                            ? 'Cantrip'
                            : `Level ${String(detailItem.system?.level)}`}
                          {detailItem.system?.school && ` ${String(detailItem.system.school)}`}
                        </>
                      ) : (
                        <>
                          {detailItem.type?.charAt(0)?.toUpperCase()}
                          {detailItem.type?.slice(1)}
                          {(detailItem.system as Record<string, unknown> | undefined)?.equipped &&
                            ' • Equipped'}
                        </>
                      )}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <Separator className="my-3" />

              {detailItem.type === 'weapon' &&
                (detailItem.system?.damage as Record<string, unknown>)?.base && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Damage
                    </div>
                    <div className="text-sm space-y-0.5">
                      <p className="flex justify-between">
                        <span>{buildDamageFormula(detailItem) || '—'}</span>
                        <span className="text-muted-foreground">
                          {(
                            (
                              (detailItem.system?.damage as Record<string, unknown>)
                                ?.base as Record<string, unknown>
                            )?.types as string[]
                          )?.join(', ') || ''}
                        </span>
                      </p>
                      {!!(detailItem.system?.damage as Record<string, unknown>)?.versatile && (
                        <p className="text-muted-foreground text-xs">
                          Versatile:{' '}
                          {formatVersatile(
                            (detailItem.system?.damage as Record<string, unknown>)?.versatile,
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}

              {detailItem.type === 'equipment' && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Armor
                  </div>
                  <div className="text-sm space-y-0.5">
                    <p>
                      AC{' '}
                      {String((detailItem.system?.armor as Record<string, unknown>)?.value || '?')}
                    </p>
                    {!!(detailItem.system?.type as Record<string, unknown>)?.value && (
                      <p>
                        Type: {String((detailItem.system?.type as Record<string, unknown>).value)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {detailItem.type === 'spell' && detailItem.system && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Details
                  </div>
                  <div className="text-sm space-y-1">
                    {detailItem.system.level !== undefined && (
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Level</span>
                        <span>
                          {(detailItem.system.level as number) === 0
                            ? 'Cantrip'
                            : String(detailItem.system.level)}
                        </span>
                      </p>
                    )}
                    {detailItem.system.school && (
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">School</span>
                        <span>{String(detailItem.system.school)}</span>
                      </p>
                    )}
                    {(detailItem.system.components as Record<string, unknown> | string) && (
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Components</span>
                        <span>
                          {formatDetailField(
                            (detailItem.system.components as Record<string, unknown>)?.value ||
                              detailItem.system.components,
                          )}
                        </span>
                      </p>
                    )}
                    {(detailItem.system.castingTime as Record<string, unknown> | string) && (
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Casting Time</span>
                        <span>{formatDetailField(detailItem.system.castingTime)}</span>
                      </p>
                    )}
                    {(detailItem.system.range as Record<string, unknown> | string) && (
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Range</span>
                        <span>{formatDetailField(detailItem.system.range)}</span>
                      </p>
                    )}
                    {(detailItem.system.duration as Record<string, unknown> | string) && (
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Duration</span>
                        <span>{formatDetailField(detailItem.system.duration)}</span>
                      </p>
                    )}
                    {(detailItem.system.target as Record<string, unknown> | string) && (
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Target</span>
                        <span>{formatDetailField(detailItem.system.target)}</span>
                      </p>
                    )}
                    {!!(
                      (detailItem.system.damage as Record<string, unknown>)?.parts as
                        | unknown[][]
                        | undefined
                    )?.[0]?.[0] && (
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Damage</span>
                        <span>
                          {String(
                            (((detailItem.system.damage as Record<string, unknown>)
                              ?.parts as unknown[][]) || [])?.[0]?.[0] ?? '',
                          )}
                        </span>
                      </p>
                    )}
                    {!!(detailItem.system.save as Record<string, unknown>)?.ability && (
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Save</span>
                        <span>
                          {String(
                            (detailItem.system.save as Record<string, unknown>).ability,
                          ).toUpperCase()}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {(detailItem.system?.quantity as number) && (
                <div className="mb-3 text-sm">
                  <span className="text-muted-foreground">Quantity: </span>
                  <span>{String(detailItem.system?.quantity)}</span>
                </div>
              )}

              {/* Attunement */}
              {(detailItem.system?.attunement as Record<string, unknown>) && (
                <div className="mb-3">
                  {(() => {
                    const att = detailItem.system?.attunement as Record<string, unknown>;
                    const isAttunementItem =
                      typeof att === 'object'
                        ? att.required || att.value !== undefined
                        : Number(att) > 0;
                    const isAttuned = typeof att === 'object' ? !!att.value : Number(att) >= 2;
                    if (!isAttunementItem) return null;
                    return (
                      <Button
                        size="sm"
                        variant={isAttuned ? 'default' : 'outline'}
                        className="w-full"
                        disabled={attuneMutation.isPending}
                        onClick={() =>
                          attuneMutation.mutate({
                            itemName: detailItem.name || '',
                            attuned: !isAttuned,
                          })
                        }
                      >
                        {isAttuned
                          ? 'Attuned (click to unattune)'
                          : 'Not Attuned (click to attune)'}
                      </Button>
                    );
                  })()}
                </div>
              )}

              <Separator className="my-3" />
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Description
                </div>
                {(detailItem.system?.description as Record<string, unknown>)?.value ? (
                  <div
                    className="text-sm prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: (detailItem.system?.description as Record<string, unknown>)
                        .value as string,
                    }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">No description available.</p>
                )}
              </div>

              {detailItem.type === 'weapon' && buildDamageFormula(detailItem) && (
                <div className="mt-4">
                  <Button
                    className="w-full"
                    size="sm"
                    disabled={rolling === `weapon-${detailItem.name}`}
                    onClick={() =>
                      doRoll(`${detailItem.name} damage`, buildDamageFormula(detailItem))
                    }
                  >
                    <Swords className="h-4 w-4 mr-1.5" />
                    {rolling === `weapon-${detailItem.name}` ? 'Rolling...' : 'Roll Damage'}
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function CharacterSheet({ uuid, isLoading }: { uuid: string; isLoading?: boolean }) {
  const { data, isLoading: loading } = useQuery({
    queryKey: ['actor', uuid],
    queryFn: () => relay.get(uuid),
    enabled: !!uuid,
  });

  const { data: effectsData } = useQuery({
    queryKey: ['effects', uuid],
    queryFn: () => relay.getActorEffects(uuid),
    enabled: !!uuid,
  });

  const isLoading_ = isLoading || loading;

  if (!uuid) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Crosshair className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-lg">Select a character to view their sheet</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading_) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading character data...</p>
      </div>
    );
  }

  const dataRecord = data as { data?: { name?: string } } | undefined;
  if (!dataRecord?.data?.name) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No character data found for this actor.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <CharacterSheetInner
      actorData={data as { data?: Record<string, unknown> }}
      effectsData={effectsData as { data?: FoundryEffect[] }}
      uuid={uuid}
    />
  );
}

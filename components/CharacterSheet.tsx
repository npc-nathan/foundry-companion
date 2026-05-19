'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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

import { useActorData } from '@/components/character-sheet/use-actor-data';
import { useActorMutations } from '@/components/character-sheet/use-actor-mutations';
import type { FoundryItem, FoundryEffect } from '@/components/character-sheet/types';
import {
  getMod,
  hpColor,
  buildDamageFormula,
  formatVersatile,
  formatDetailField,
  ABILITY_NAMES,
} from '@/components/character-sheet/types';

/* ── Local JSX helpers ──────────────────────────────────────────────────── */

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

/* ── Icon map for item sections returned by useActorData ────────────────── */

const SECTION_ICON_MAP: Record<string, React.ReactNode> = {
  Backpack: <Backpack className="h-4 w-4" />,
  Swords: <Swords className="h-4 w-4" />,
  ScrollText: <ScrollText className="h-4 w-4" />,
  Sparkles: <Sparkles className="h-4 w-4" />,
};

/* ── Inner component ─────────────────────────────────────────────────────── */

function CharacterSheetInner({
  actorData,
  effectsData,
  uuid,
}: {
  actorData: { data?: Record<string, unknown> };
  effectsData: { data?: FoundryEffect[] };
  uuid: string;
}) {
  const [damage, setDamage] = useState('');
  const [heal, setHeal] = useState('');
  const [detailItem, setDetailItem] = useState<FoundryItem | null>(null);
  const [rolling, setRolling] = useState<string | null>(null);
  const [, setLastRollResult] = useState<{ label: string; total: number } | null>(null);

  const data = useActorData(actorData, effectsData);
  const mutations = useActorMutations(uuid);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailItem(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const doRoll = useCallback(
    async (label: string, formula: string) => {
      setRolling(label);
      try {
        await mutations.doRoll(label, formula);
        setLastRollResult({ label, total: 0 });
      } catch (e) {
        toast.error(`Roll failed: ${String(e)}`);
      } finally {
        setRolling(null);
      }
    },
    [mutations],
  );

  const detailImage = detailItem?.img
    ? `/api/relay/download?path=${encodeURIComponent(detailItem.img)}&source=data`
    : null;

  const {
    identity,
    hp,
    combat,
    abilities,
    skills,
    saves,
    weapons,
    armor,
    consumables,
    itemSections,
    currency,
    spellSlots,
    spellItems,
    traits,
    effects,
    raw: { spells: spellsRaw },
  } = data;

  return (
    <div className="space-y-6">
      {/* Character Identity */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl font-bold overflow-hidden">
          {identity.img && !identity.img.includes('mystery-man') ? (
            <Image
              src={`/api/relay/download?path=${encodeURIComponent(identity.img)}&source=data`}
              alt={identity.name}
              width={56}
              height={56}
              unoptimized
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            identity.name.charAt(0).toUpperCase() || '?'
          )}
        </div>
        <div>
          <h2 className="text-xl font-heading font-bold">{identity.name}</h2>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {identity.race && (
              <Badge variant="secondary" className="text-xs">
                {identity.race}
              </Badge>
            )}
            {identity.class && (
              <Badge variant="secondary" className="text-xs">
                {identity.class} {identity.level}
              </Badge>
            )}
            {!identity.class && identity.background && (
              <Badge variant="secondary" className="text-xs">
                {identity.background}
              </Badge>
            )}
            {identity.alignment && (
              <Badge variant="outline" className="text-xs">
                {identity.alignment}
              </Badge>
            )}
            {identity.size && (
              <Badge variant="outline" className="text-xs">
                {identity.size.toUpperCase()}
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
            <div className="text-2xl font-heading font-bold mb-1">
              {hp.value} / {hp.max}
              {hp.temp > 0 && <span className="text-sm text-blue-400 ml-2">+{hp.temp} temp</span>}
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${hpColor(hp.pct)} transition-all duration-300 rounded-full`}
                style={{ width: `${Math.max(hp.pct, 0)}%` }}
              />
            </div>
            <div className="flex gap-2 mt-3">
              <div className="flex-1 flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="px-2"
                  disabled={mutations.damageMutation.isPending}
                  onClick={() => mutations.damageMutation.mutate(5)}
                >
                  -5
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="px-2"
                  disabled={mutations.damageMutation.isPending}
                  onClick={() => mutations.damageMutation.mutate(1)}
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
                  disabled={!damage || mutations.damageMutation.isPending}
                  onClick={() => mutations.damageMutation.mutate(Number(damage))}
                >
                  Damage
                </Button>
              </div>
              <div className="flex-1 flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="px-2"
                  disabled={mutations.healMutation.isPending}
                  onClick={() => mutations.healMutation.mutate(1)}
                >
                  +1
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="px-2"
                  disabled={mutations.healMutation.isPending}
                  onClick={() => mutations.healMutation.mutate(5)}
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
                  disabled={!heal || mutations.healMutation.isPending}
                  onClick={() => mutations.healMutation.mutate(Number(heal))}
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
                disabled={mutations.shortRestMutation.isPending}
                onClick={() => mutations.shortRestMutation.mutate(undefined as unknown as void)}
              >
                {mutations.shortRestMutation.isPending ? 'Resting...' : 'Short Rest'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                disabled={mutations.longRestMutation.isPending}
                onClick={() => mutations.longRestMutation.mutate(undefined as unknown as void)}
              >
                {mutations.longRestMutation.isPending ? 'Resting...' : 'Long Rest'}
              </Button>
            </div>
            {hp.value <= 0 && (
              <Button
                size="sm"
                variant="destructive"
                className="w-full mt-2"
                disabled={mutations.deathSaveMutation.isPending}
                onClick={() => mutations.deathSaveMutation.mutate(undefined as unknown as void)}
              >
                {mutations.deathSaveMutation.isPending ? 'Rolling...' : 'Death Saving Throw'}
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
              <span className="text-xl font-bold">{combat.acValue}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Footprints className="h-3.5 w-3.5" /> Speed
              </span>
              <span className="text-xl font-bold">
                {combat.speed}
                <span className="text-xs text-muted-foreground ml-1">ft</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Initiative</span>
              <span className="text-lg font-semibold">
                {typeof combat.initBonus === 'number'
                  ? `${combat.initBonus >= 0 ? '+' : ''}${combat.initBonus}`
                  : combat.initBonus}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Prof. Bonus</span>
              <span className="text-lg font-semibold">+{combat.profBonus}</span>
            </div>
            {combat.xp !== null && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">XP</span>
                <span className="text-sm font-mono">{combat.xp.toLocaleString()}</span>
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
              const abil = abilities[ab];
              const val = abil?.value ?? 10;
              const mod = getMod(val);
              const proficient = abil?.proficient ?? false;
              const isRolling = rolling === `ability-${ab}`;
              return (
                <button
                  key={ab}
                  type="button"
                  disabled={isRolling || mutations.abilityCheckMutation.isPending}
                  onClick={() => mutations.abilityCheckMutation.mutate(ab)}
                  className="text-center p-3 rounded-lg bg-muted/50 border cursor-pointer hover:bg-muted/80 hover:border-primary/30 transition-colors disabled:opacity-50"
                >
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    {ABILITY_NAMES[ab]}
                  </div>
                  <div className="text-2xl font-heading font-bold mt-1">{val}</div>
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
            {skills.map((skill) => {
              const isRolling = rolling === `skill-${skill.key}`;
              return (
                <button
                  key={skill.key}
                  type="button"
                  disabled={isRolling || mutations.skillCheckMutation.isPending}
                  onClick={() => mutations.skillCheckMutation.mutate(skill.key)}
                  className={`flex items-center justify-between px-3 py-1.5 rounded text-sm cursor-pointer hover:bg-muted/60 hover:border hover:border-primary/20 transition-colors disabled:opacity-50 ${skill.proficient ? 'bg-muted/40 font-medium' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    {skill.proficient && <span className="text-[10px] text-primary">●</span>}
                    {skill.label}
                    {isRolling && <span className="text-[9px] text-primary ml-1">roll...</span>}
                  </span>
                  <span
                    className={`font-mono text-xs ${skill.total >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {skill.total >= 0 ? `+${skill.total}` : skill.total}
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
            {saves.map((save) => {
              const isRolling = rolling === `save-${save.ability}`;
              return (
                <button
                  key={save.ability}
                  type="button"
                  disabled={isRolling}
                  onClick={() => {
                    setRolling(`save-${save.ability}`);
                    relay
                      .dndAbilitySave({
                        actorUuid: uuid,
                        ability: save.ability,
                        createChatMessage: true,
                      })
                      .then((r: unknown) => {
                        const result = r as
                          | { data?: { total?: number; saveTotal?: number } }
                          | undefined;
                        const total = result?.data?.total ?? result?.data?.saveTotal ?? '?';
                        setLastRollResult({ label: `${save.label} Save`, total: total as number });
                        toast.success(`${save.label} Save: ${total}`);
                      })
                      .catch((e: Error) => toast.error(`Save failed: ${String(e)}`))
                      .finally(() => setRolling(null));
                  }}
                  className={`text-center p-3 rounded-lg border cursor-pointer hover:bg-muted/80 hover:border-primary/30 transition-colors disabled:opacity-50 ${save.proficient ? 'bg-muted/40 border-primary/20' : 'bg-muted/50 border-transparent'}`}
                >
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    {save.label}
                  </div>
                  <div
                    className={`text-lg font-heading font-bold mt-0.5 ${save.bonus >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {save.bonus >= 0 ? `+${save.bonus}` : save.bonus}
                  </div>
                  {save.proficient && <div className="text-[9px] text-primary mt-0.5">● PROF</div>}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      {(weapons.length > 0 || armor.length > 0) && (
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
                            disabled={mutations.attuneMutation.isPending}
                            onClick={() =>
                              mutations.attuneMutation.mutate({
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
                        disabled={mutations.equipMutation.isPending}
                        onClick={() =>
                          mutations.equipMutation.mutate({
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
              {SECTION_ICON_MAP[section.iconName] || <Swords className="h-4 w-4" />}
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
              { label: 'PP', value: currency.pp, color: 'text-indigo-300' },
              { label: 'GP', value: currency.gp, color: 'text-yellow-400' },
              { label: 'EP', value: currency.ep, color: 'text-cyan-300' },
              { label: 'SP', value: currency.sp, color: 'text-gray-300' },
              { label: 'CP', value: currency.cp, color: 'text-amber-600' },
            ].map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-muted/40"
              >
                <span className={`text-sm font-bold ${c.color}`}>{c.value}</span>
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
            ))}
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
          {((spellsRaw.pact as Record<string, unknown> | undefined)?.value as number) > 0 && (
            <div className="mt-2 text-center">
              <Badge variant="outline" className="text-xs">
                Pact Magic: {String((spellsRaw.pact as Record<string, unknown>).value)} slot
                {Number((spellsRaw.pact as Record<string, unknown>).value) !== 1 ? 's' : ''}
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
                const abilObj = data.raw.abilities[spellAbility] as Record<string, unknown> | undefined;
                const spellMod = (abilObj?.value as number) || 10;
                const spellAttackMod = getMod(spellMod) + combat.profBonus;
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
                        disabled={mutations.prepareSpellMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          mutations.prepareSpellMutation.mutate({
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
            {traits.biography && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                  Biography
                </h4>
                <div
                  className="text-sm prose-sm prose-invert max-w-none [&_p]:mb-1"
                  dangerouslySetInnerHTML={{
                    __html: traits.biography,
                  }}
                />
              </div>
            )}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                Damage Resistances
              </h4>
              <p className="text-sm">
                {traits.dr.join(', ') || 'None'}
                {traits.drCustom && ` (${traits.drCustom})`}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                Condition Immunities
              </h4>
              <p className="text-sm">{traits.ci.join(', ') || 'None'}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                Languages
              </h4>
              <p className="text-sm">
                {traits.languages.join(', ') || 'None'}
                {traits.languagesCustom && ` (${traits.languagesCustom})`}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                Senses
              </h4>
              <p className="text-sm">{traits.senses}</p>
            </div>
            {traits.resources.map((r, i) => (
              <div key={i}>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                  {r.label}
                </h4>
                <p className="text-sm">
                  {r.value}/{r.max}
                  {r.sr && ' (Short Rest)'}
                  {r.lr && ' (Long Rest)'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Effects */}
      {effects.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-400" /> Active Effects ({effects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {effects.map((effect: FoundryEffect) => (
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
                        disabled={mutations.attuneMutation.isPending}
                        onClick={() =>
                          mutations.attuneMutation.mutate({
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

/* ── Outer component (data fetching shell) ───────────────────────────────── */

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

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Shield, Footprints, Sword } from 'lucide-react';
import { hpColor, buildDamageFormula, formatVersatile } from '@/components/character-sheet/types';
import type { FoundryItem } from '@/components/character-sheet/types';
import type { SheetTabProps } from './types';

export function CombatTab({
  data, mutations, rolling, setDetailItem,
  setRolling: _setRolling, uuid: _uuid, readOnly,
}: SheetTabProps) {
  const [damage, setDamage] = useState('');
  const [heal, setHeal] = useState('');
  const { hp, combat, weapons, armor } = data;

  const doRoll = mutations.doRoll;

  return (
    <div className="space-y-4">
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
            {!readOnly && (<>
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
            </>)}
          </CardContent>
        </Card>

        {/* Combat Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" /> Stats
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

      {/* Weapons & Armor */}
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
                        {!readOnly && needsAttune && (
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
                      {!readOnly && (
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
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

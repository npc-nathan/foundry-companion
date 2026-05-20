'use client';

import { BookOpen, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getMod } from '@/components/character-sheet/types';
import type { FoundryItem } from '@/components/character-sheet/types';
import type { SheetTabProps } from './types';

export function SpellsTab({
  data, mutations, rolling, setDetailItem,
  setRolling: _setRolling, uuid: _uuid, readOnly,
}: SheetTabProps) {
  const { spellSlots, spellItems, raw: rawData } = data;
  const combat = data.combat;

  return (
    <div className="space-y-4">
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
          {((rawData.spells?.pact as Record<string, unknown> | undefined)?.value as number) > 0 && (
            <div className="mt-2 text-center">
              <Badge variant="outline" className="text-xs">
                Pact Magic: {String((rawData.spells.pact as Record<string, unknown>).value)} slot
                {Number((rawData.spells.pact as Record<string, unknown>).value) !== 1 ? 's' : ''}
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
                const abilObj = rawData.abilities[spellAbility] as Record<string, unknown> | undefined;
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
                    {canPrepare && !readOnly ? (
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
                              mutations.doRoll(
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
    </div>
  );
}

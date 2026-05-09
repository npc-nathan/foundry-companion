'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relay } from '@/lib/relay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function CombatPage() {
  const queryClient = useQueryClient();
  const [combatDamage, setCombatDamage] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['encounters'],
    queryFn: () => relay.encounters(),
    refetchInterval: 5000,
  });

  const encounters: any[] = (data as any)?.encounters || [];
  const activeEncounter = encounters.find((e: any) => e.current);

  const nextTurnMutation = useMutation({
    mutationFn: () => relay.nextTurn(activeEncounter?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
      toast.success('Next turn');
    },
    onError: (err) => toast.error(String(err)),
  });

  const previousTurnMutation = useMutation({
    mutationFn: () => relay.previousTurn(activeEncounter?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
      toast.success('Previous turn');
    },
    onError: (err) => toast.error(String(err)),
  });

  const nextRoundMutation = useMutation({
    mutationFn: () => relay.nextRound(activeEncounter?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
      toast.success('Next round');
    },
    onError: (err) => toast.error(String(err)),
  });

  const previousRoundMutation = useMutation({
    mutationFn: () => relay.previousRound(activeEncounter?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
      toast.success('Previous round');
    },
    onError: (err) => toast.error(String(err)),
  });

  const endEncounterMutation = useMutation({
    mutationFn: () => relay.endEncounter(activeEncounter?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
      toast.success('Encounter ended');
    },
    onError: (err) => toast.error(String(err)),
  });

  const hpDamageMutation = useMutation({
    mutationFn: ({ actorId, amount }: { actorId: string; amount: number }) =>
      relay.decrease(`Actor.${actorId}`, 'system.attributes.hp.value', amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
    },
    onError: (err) => toast.error(String(err)),
  });

  const hpHealMutation = useMutation({
    mutationFn: ({ actorId, amount }: { actorId: string; amount: number }) =>
      relay.increase(`Actor.${actorId}`, 'system.attributes.hp.value', amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
    },
    onError: (err) => toast.error(String(err)),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading combat tracker...</p></div>;
  }

  if (!activeEncounter) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Combat Tracker</h1>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>No active combat encounter</p>
            <p className="text-xs mt-2">Start an encounter from Foundry VTT to see it here</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const combatants: any[] = activeEncounter.combatants || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Combat Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeEncounter.name || 'Unnamed Encounter'} — Round {activeEncounter.round || 1}
          </p>
        </div>
        <Badge variant="default" className="text-sm px-3 py-1">Round {activeEncounter.round || 1}</Badge>
      </div>

      {/* Combat Controls */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => previousTurnMutation.mutate()} disabled={previousTurnMutation.isPending}>
          ◀ Prev Turn
        </Button>
        <Button variant="outline" size="sm" onClick={() => nextTurnMutation.mutate()} disabled={nextTurnMutation.isPending}>
          Next Turn ▶
        </Button>
        <Button variant="outline" size="sm" onClick={() => previousRoundMutation.mutate()} disabled={previousRoundMutation.isPending}>
          ◀◀ Prev Round
        </Button>
        <Button variant="outline" size="sm" onClick={() => nextRoundMutation.mutate()} disabled={nextRoundMutation.isPending}>
          Next Round ▶▶
        </Button>
        <Button variant="destructive" size="sm" onClick={() => endEncounterMutation.mutate()} disabled={endEncounterMutation.isPending}>
          End Encounter
        </Button>
      </div>

      {/* Combatant List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Combatants ({combatants.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {combatants.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">No combatants in this encounter</div>
          ) : (
            <div className="divide-y">
              {combatants.map((c: any, i: number) => {
                const isActive = c.id === activeEncounter.current?.combatantId;
                const actorId = c.actor?.id || c.actor?._id;
                const isHpPending = hpDamageMutation.isPending || hpHealMutation.isPending;
                const hpVal = c?.actor?.system?.attributes?.hp?.value ?? c?.actor?.system?.hp?.value;
                const hpMax = c?.actor?.system?.attributes?.hp?.max ?? c?.actor?.system?.hp?.max;
                const hpPct = hpMax > 0 ? Math.round((hpVal / hpMax) * 100) : 100;
                const dmgKey = c.id || `c-${i}`;
                const dmgInput = combatDamage[dmgKey] ?? '';

                const doDamage = (amount: number) => {
                  if (actorId) hpDamageMutation.mutate({ actorId, amount });
                };
                const doHeal = (amount: number) => {
                  if (actorId) hpHealMutation.mutate({ actorId, amount });
                };

                return (
                  <div
                    key={c.id || i}
                    className={`flex items-center justify-between p-3 ${isActive ? 'bg-accent' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{c.name || c.actor?.name || 'Unknown'}</div>
                        {typeof hpVal === 'number' && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${hpPct > 50 ? 'bg-green-500' : hpPct > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.max(hpPct, 0)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{hpVal}/{hpMax}</span>
                          </div>
                        )}
                        {/* Inline damage/heal controls */}
                        {actorId && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs" disabled={isHpPending}
                              onClick={() => doDamage(1)}>-1</Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs" disabled={isHpPending}
                              onClick={() => doDamage(5)}>-5</Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs" disabled={isHpPending}
                              onClick={() => doDamage(10)}>-10</Button>
                            <input
                              type="number"
                              value={dmgInput}
                              onChange={(e) => setCombatDamage(prev => ({ ...prev, [dmgKey]: e.target.value }))}
                              placeholder="dmg"
                              className="w-12 h-6 px-1 rounded border bg-background text-[10px]"
                            />
                            <Button size="sm" variant="ghost" className="h-6 w-8 p-0 text-[10px] text-red-400" disabled={!dmgInput || isHpPending}
                              onClick={() => { doDamage(Number(dmgInput)); setCombatDamage(prev => ({ ...prev, [dmgKey]: '' })); }}>DMG</Button>
                            <Button size="sm" variant="ghost" className="h-6 w-7 p-0 text-xs text-green-400" disabled={isHpPending}
                              onClick={() => doHeal(1)}>+1</Button>
                            <Button size="sm" variant="ghost" className="h-6 w-7 p-0 text-xs text-green-400" disabled={isHpPending}
                              onClick={() => doHeal(5)}>+5</Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-sm font-mono">{c.initiative ?? '—'}</div>
                      <div className="text-[10px] text-muted-foreground">Init</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

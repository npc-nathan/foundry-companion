'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relay } from '@/lib/relay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Dice1, Dice2, Dice3, Dice4, Dice5, Dice6,
  Skull, Zap, Sword, Wand, Heart,
} from 'lucide-react';

interface ActorStub {
  uuid: string;
  name: string;
  type?: string;
}

const DICE_PRESETS = [
  { label: 'd4', formula: '1d4', icon: Dice1 },
  { label: 'd6', formula: '1d6', icon: Dice2 },
  { label: 'd8', formula: '1d8', icon: Dice3 },
  { label: 'd10', formula: '1d10', icon: Dice4 },
  { label: 'd12', formula: '1d12', icon: Dice5 },
  { label: 'd20', formula: '1d20', icon: Dice6 },
  { label: '2d6', formula: '2d6', icon: Dice2 },
  { label: '3d6', formula: '3d6', icon: Dice3 },
  { label: 'd100', formula: '1d100', icon: Dice4 },
];

const DAMAGE_PRESETS = [
  { label: 'Fireball', formula: '8d6', icon: Zap, color: 'text-orange-500' },
  { label: 'Longsword', formula: '1d8', icon: Sword, color: 'text-blue-400' },
  { label: 'Greatsword', formula: '2d6', icon: Sword, color: 'text-blue-400' },
  { label: 'Magic Missile', formula: '3d4+3', icon: Wand, color: 'text-purple-400' },
  { label: 'Cure Wounds', formula: '2d8+3', icon: Heart, color: 'text-green-400' },
  { label: 'Sneak Attack', formula: '3d6', icon: Dice2, color: 'text-gray-400' },
];

const ABILITIES = [
  { value: 'str', label: 'STR' },
  { value: 'dex', label: 'DEX' },
  { value: 'con', label: 'CON' },
  { value: 'int', label: 'INT' },
  { value: 'wis', label: 'WIS' },
  { value: 'cha', label: 'CHA' },
];

const SKILLS = [
  { value: 'acr', label: 'Acrobatics' },
  { value: 'ath', label: 'Athletics' },
  { value: 'ste', label: 'Stealth' },
  { value: 'prc', label: 'Perception' },
  { value: 'inv', label: 'Investigation' },
  { value: 'ins', label: 'Insight' },
  { value: 'prs', label: 'Persuasion' },
  { value: 'dec', label: 'Deception' },
  { value: 'arc', label: 'Arcana' },
  { value: 'his', label: 'History' },
  { value: 'nat', label: 'Nature' },
  { value: 'rel', label: 'Religion' },
  { value: 'ani', label: 'Animal Handling' },
  { value: 'med', label: 'Medicine' },
  { value: 'sur', label: 'Survival' },
  { value: 'sof', label: 'Sleight of Hand' },
  { value: 'per', label: 'Performance' },
  { value: 'int', label: 'Intimidation' },
];

function extractActors(data: any): ActorStub[] {
  const list: ActorStub[] = [];
  const entities: any[] = data?.data?.entities?.actors || [];
  const folders: Record<string, any> = data?.data?.folders || {};

  for (const e of entities) list.push({ uuid: e.uuid, name: e.name, type: e.type });
  for (const f of Object.values(folders)) {
    if ((f as any)?.entities) {
      for (const e of (f as any).entities) {
        list.push({ uuid: e.uuid, name: e.name, type: e.type });
      }
    }
  }
  return list;
}

export default function GMDicePage() {
  const queryClient = useQueryClient();
  const [customFormula, setCustomFormula] = useState('');
  const [selectedActor, setSelectedActor] = useState('');
  const [lastRoll, setLastRoll] = useState<{ formula: string; total: number } | null>(null);

  const { data: actorsData } = useQuery({
    queryKey: ['structure', 'Actor'],
    queryFn: () => relay.structure('Actor'),
  });

  const { data: rollsData } = useQuery({
    queryKey: ['rolls'],
    queryFn: () => relay.getRolls(10),
  });

  const actors = extractActors(actorsData);
  const recentRolls: any[] = (rollsData as any)?.data || [];

  function safeStr(v: unknown): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    return '';
  }

  const rollMutation = useMutation({
    mutationFn: (formula: string) => relay.roll({ formula, createChatMessage: true }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['rolls'] });
      // POST /roll returns { type, requestId, success, data: { id, chatMessageCreated, roll: { formula, total, dice, ... } } }
      const rollData = data?.data?.roll || data?.roll || data;
      const total = rollData?.total ?? '?';
      const expr = rollData?.formula ?? customFormula;
      setLastRoll({ formula: String(expr), total: typeof total === 'number' ? total : 0 });
      toast.success(`🎲 ${expr} → ${total}`);
    },
    onError: (err) => toast.error(String(err)),
  });

  const doRoll = useCallback((formula: string) => {
    rollMutation.mutate(formula);
  }, [rollMutation]);

  const deathSaveMutation = useMutation({
    mutationFn: (actorUuid: string) =>
      relay.dndDeathSave({ actorUuid, createChatMessage: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolls'] });
      toast.success('Death save rolled!');
    },
    onError: (err) => toast.error(String(err)),
  });

  const abilityCheckMutation = useMutation({
    mutationFn: (params: { actorUuid: string; ability: string }) =>
      relay.dndAbilityCheck({
        actorUuid: params.actorUuid,
        ability: params.ability,
        createChatMessage: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolls'] });
      toast.success('Ability check rolled!');
    },
    onError: (err) => toast.error(String(err)),
  });

  const abilitySaveMutation = useMutation({
    mutationFn: (params: { actorUuid: string; ability: string }) =>
      relay.dndAbilitySave({
        actorUuid: params.actorUuid,
        ability: params.ability,
        createChatMessage: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolls'] });
      toast.success('Saving throw rolled!');
    },
    onError: (err) => toast.error(String(err)),
  });

  const skillCheckMutation = useMutation({
    mutationFn: (params: { actorUuid: string; skill: string }) =>
      relay.dndSkillCheck({
        actorUuid: params.actorUuid,
        skill: params.skill,
        createChatMessage: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolls'] });
      toast.success('Skill check rolled!');
    },
    onError: (err) => toast.error(String(err)),
  });

  const handleCustomRoll = () => {
    const formula = customFormula.trim();
    if (!formula) return;
    doRoll(formula);
    setCustomFormula('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dice Roller</h1>
        <p className="text-sm text-muted-foreground">Roll dice and make checks</p>
      </div>

      {/* Last Roll Display */}
      {lastRoll && (
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Last Roll</p>
              <p className="text-3xl font-bold font-mono">{lastRoll.total}</p>
              <p className="text-sm text-muted-foreground font-mono mt-1">{lastRoll.formula}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Dice Presets */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Quick Dice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DICE_PRESETS.map((d) => {
              const Icon = d.icon;
              return (
                <Button
                  key={d.formula}
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => doRoll(d.formula)}
                  disabled={rollMutation.isPending}
                >
                  <Icon className="h-3.5 w-3.5 mr-1.5" />
                  {d.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Damage Dice Presets */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Damage & Healing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DAMAGE_PRESETS.map((d) => (
              <Button
                key={d.formula}
                variant="outline"
                size="sm"
                className={`h-9 ${d.color}`}
                onClick={() => doRoll(d.formula)}
                disabled={rollMutation.isPending}
              >
                <d.icon className="h-3.5 w-3.5 mr-1.5" />
                {d.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Formula */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Custom Formula</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={customFormula}
              onChange={(e) => setCustomFormula(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomRoll();
              }}
              placeholder="e.g. 1d20+5, 3d8+2, 2d6"
              className="font-mono"
            />
            <Button
              onClick={handleCustomRoll}
              disabled={!customFormula.trim() || rollMutation.isPending}
            >
              Roll
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actor Selector + D&D Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            D&D Actions
            <Badge variant="outline" className="ml-2 text-[10px]">
              Requires actor selection
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedActor} onValueChange={(v) => v && setSelectedActor(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select an actor..." />
            </SelectTrigger>
            <SelectContent>
              {actors.map((a) => (
                <SelectItem key={a.uuid} value={a.uuid}>
                  {a.name}
                </SelectItem>
              ))}
              {actors.length === 0 && (
                <SelectItem value="none" disabled>
                  No actors found
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {selectedActor && (
            <div className="space-y-4">
              {/* Death Save */}
              <div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deathSaveMutation.mutate(selectedActor)}
                  disabled={deathSaveMutation.isPending}
                >
                  <Skull className="h-4 w-4 mr-1.5" />
                  Death Save
                </Button>
              </div>

              {/* Ability Checks */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Ability Check</p>
                <div className="flex flex-wrap gap-1.5">
                  {ABILITIES.map((a) => (
                    <Button
                      key={a.value}
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() =>
                        abilityCheckMutation.mutate({
                          actorUuid: selectedActor,
                          ability: a.value,
                        })
                      }
                      disabled={abilityCheckMutation.isPending}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Ability Saves */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Saving Throw</p>
                <div className="flex flex-wrap gap-1.5">
                  {ABILITIES.map((a) => (
                    <Button
                      key={a.value}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() =>
                        abilitySaveMutation.mutate({
                          actorUuid: selectedActor,
                          ability: a.value,
                        })
                      }
                      disabled={abilitySaveMutation.isPending}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Skill Checks */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Skill Check</p>
                <div className="flex flex-wrap gap-1.5">
                  {SKILLS.map((s) => (
                    <Button
                      key={s.value}
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        skillCheckMutation.mutate({
                          actorUuid: selectedActor,
                          skill: s.value,
                        })
                      }
                      disabled={skillCheckMutation.isPending}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Backend Rolls */}
      {recentRolls.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Game Rolls</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentRolls.slice(0, 10).map((roll: any, i: number) => (
                <div key={roll.id || i} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <span className="font-mono text-muted-foreground">
                      {roll.formula || roll.expression || '—'}
                    </span>
                    {(() => {
                      const speakerLabel = safeStr(roll.speaker && typeof roll.speaker === 'object' ? (roll.speaker as any).alias || (roll.speaker as any).actor || (roll.speaker as any).token || '' : roll.speaker);
                      return speakerLabel ? (
                        <span className="text-xs text-muted-foreground ml-2">
                          by {speakerLabel}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="text-right">
                    <span className="font-bold font-mono">{roll.rollTotal ?? '?'}</span>
                    {roll.dice && (
                      <div className="text-[10px] text-muted-foreground">
                        {Array.isArray(roll.dice)
                          ? (roll.dice as any[]).map((d: any) => {
                              if (typeof d !== 'object') return safeStr(d);
                              const results = d.results || [];
                              return results.map((r: any) => r.result ?? r).join(', ');
                            }).join(', ')
                          : safeStr(roll.dice)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

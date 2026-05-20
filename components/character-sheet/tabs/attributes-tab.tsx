'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Sparkles, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { ABILITY_NAMES, getMod } from '@/components/character-sheet/types';
import { relay } from '@/lib/relay';
import type { SheetTabProps } from './types';

export function AttributesTab({ data, mutations, rolling, setRolling, uuid, readOnly }: SheetTabProps) {
  const { abilities, skills, saves } = data;

  return (
    <div className="space-y-4">
      {/* Ability Scores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" /> Ability Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((ab) => {
              const abil = abilities[ab];
              const val = abil?.value ?? 10;
              const mod = getMod(val);
              const proficient = abil?.proficient ?? false;
              const isRolling = rolling === `ability-${ab}`;
              return (
                <button
                  key={ab}
                  type="button"
                  disabled={isRolling || mutations.abilityCheckMutation.isPending || readOnly}
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
                  disabled={isRolling || mutations.skillCheckMutation.isPending || readOnly}
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
                  disabled={isRolling || readOnly}
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
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relay } from '@/lib/relay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dice6, Dice2, Dice3, Dice4, Dice1, Dice5 } from 'lucide-react';

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

export default function PlayerDicePage() {
  const queryClient = useQueryClient();
  const [customFormula, setCustomFormula] = useState('');
  const [lastRoll, setLastRoll] = useState<{ formula: string; total: number } | null>(null);

  const { data: rollsData } = useQuery({
    queryKey: ['rolls'],
    queryFn: () => relay.getRolls(5),
  });

  const recentRolls: unknown[] = ((rollsData as { data?: unknown })?.data as unknown[]) || [];

  function safeStr(v: unknown): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    return '';
  }

  const rollMutation = useMutation({
    mutationFn: (formula: string) =>
      relay.roll({ formula, createChatMessage: true }) as Promise<Record<string, unknown>>,
    onSuccess: (data: Record<string, unknown>) => {
      queryClient.invalidateQueries({ queryKey: ['rolls'] });
      // POST /roll returns { type, requestId, success, data: { id, chatMessageCreated, roll: { formula, total, dice, ... } } }
      const rollData =
        (data?.data as Record<string, unknown>)?.roll ||
        (data?.roll as Record<string, unknown>) ||
        data;
      const rollRecord = (rollData as Record<string, unknown>) || {};
      const total = rollRecord?.total ?? '?';
      const expr = rollRecord?.formula ?? customFormula;
      setLastRoll({ formula: String(expr), total: typeof total === 'number' ? total : 0 });
      toast.success(`🎲 ${expr} → ${total}`);
    },
    onError: (err) => toast.error(String(err)),
  });

  const doRoll = useCallback(
    (formula: string) => {
      rollMutation.mutate(formula);
    },
    [rollMutation],
  );

  const handleCustomRoll = () => {
    const formula = customFormula.trim();
    if (!formula) return;
    doRoll(formula);
    setCustomFormula('');
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">Dice</h1>
        <p className="text-xs text-muted-foreground">Roll dice</p>
      </div>

      {/* Last Roll */}
      {lastRoll && (
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Last Roll</p>
            <p className="text-2xl font-bold font-mono">{lastRoll.total}</p>
            <p className="text-xs text-muted-foreground font-mono">{lastRoll.formula}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {DICE_PRESETS.map((d) => {
          const Icon = d.icon;
          return (
            <Button
              key={d.formula}
              variant="outline"
              size="sm"
              onClick={() => doRoll(d.formula)}
              disabled={rollMutation.isPending}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {d.label}
            </Button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          value={customFormula}
          onChange={(e) => setCustomFormula(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCustomRoll();
          }}
          placeholder="e.g. 1d20+5"
          className="font-mono"
        />
        <Button
          onClick={handleCustomRoll}
          disabled={!customFormula.trim() || rollMutation.isPending}
        >
          Roll
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Game Rolls</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentRolls.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">No recent rolls</div>
          ) : (
            <div className="divide-y">
              {recentRolls.map((roll, i: number) => {
                const r = roll as {
                  id?: string;
                  formula?: string;
                  expression?: string;
                  rollTotal?: unknown;
                };
                return (
                  <div key={r.id || i} className="flex items-center justify-between p-3 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">
                      {safeStr(r.formula || r.expression) || '—'}
                    </span>
                    <span className="font-bold font-mono">{String(r.rollTotal ?? '')}</span>
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

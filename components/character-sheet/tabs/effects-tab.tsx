'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Shield, Sparkles, Timer } from 'lucide-react';
import type { FoundryEffect, ItemEmbeddedEffect } from '../types';

interface EffectsTabProps {
  effects: FoundryEffect[];
  itemEffects: ItemEmbeddedEffect[];
}

function formatChangeValue(key: string, value: string): string {
  const parts = key.split('.');
  const shortKey = parts[parts.length - 1];
  const label = shortKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const val = value.startsWith('-') ? value : `+${value}`;
  return `${label} ${val}`;
}

function EffectBadge({
  label,
  changes,
  disabled,
  origin,
  duration,
  _icon,
}: {
  label: string;
  changes: { key: string; value: string }[];
  disabled?: boolean;
  origin?: string;
  duration?: { rounds?: number };
  _icon?: string;
}) {
  const isTemporary = duration?.rounds && duration.rounds > 0;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge
            variant={disabled ? 'outline' : isTemporary ? 'default' : 'secondary'}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${
              disabled
                ? 'opacity-50 border-dashed'
                : 'cursor-help'
            }`}
          >
            {isTemporary && <Timer className="size-3 text-amber-400" />}
            {!isTemporary && disabled && <Activity className="size-3 text-muted-foreground" />}
            <span>{label}</span>
            {origin && (
              <span className="ml-1 text-[10px] opacity-60">({origin})</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="right" align="start" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-xs">{label}</p>
            {origin && (
              <p className="text-xs text-muted-foreground">Source: {origin}</p>
            )}
            {changes && changes.length > 0 && (
              <ul className="text-xs space-y-0.5">
                {changes.map((c, i) => (
                  <li key={i} className="text-muted-foreground">
                    {formatChangeValue(c.key, c.value)}
                  </li>
                ))}
              </ul>
            )}
            {isTemporary && (
              <p className="text-xs text-amber-400">
                {duration.rounds} round{duration.rounds !== 1 ? 's' : ''} remaining
              </p>
            )}
            {disabled && (
              <p className="text-xs text-muted-foreground italic">Inactive</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function EffectsTab({ effects, itemEffects }: EffectsTabProps) {
  // Filter out origin effects that have no actual changes
  const activeEffects = (effects || []).filter(
    (ef) => ef.name || ef.label,
  );

  // Separate item effects into active and inactive
  const activeItemEffects = (itemEffects || []).filter(
    (ef) => !ef.disabled && ef.changes.length > 0,
  );
  const inactiveItemEffects = (itemEffects || []).filter(
    (ef) => ef.disabled && ef.changes.length > 0,
  );

  const hasAny =
    activeEffects.length > 0 ||
    activeItemEffects.length > 0 ||
    inactiveItemEffects.length > 0;

  if (!hasAny) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4" />
            Effects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active effects on this actor.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4" />
          Effects
          <span className="text-xs text-muted-foreground font-normal">
            ({activeEffects.length + activeItemEffects.length + inactiveItemEffects.length} total)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-6">
            {/* Active / Temporary Effects */}
            {activeEffects.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="size-3" />
                  Active Effects
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeEffects.map((effect: FoundryEffect) => (
                    <EffectBadge
                      key={effect._id || effect.name}
                      label={effect.label || effect.name || 'Effect'}
                      changes={(effect.changes || []) as { key: string; value: string }[]}
                      disabled={false}
                      duration={effect.duration as { rounds?: number } | undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Passive Item Effects (active) */}
            {activeItemEffects.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Shield className="size-3" />
                  Passive Effects
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeItemEffects.map((effect: ItemEmbeddedEffect, idx: number) => (
                    <EffectBadge
                      key={`passive-${effect.label}-${idx}`}
                      label={effect.label}
                      changes={effect.changes}
                      origin={effect.origin}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Inactive Item Effects */}
            {inactiveItemEffects.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Activity className="size-3" />
                  Inactive Effects
                </h4>
                <div className="flex flex-wrap gap-2">
                  {inactiveItemEffects.map((effect: ItemEmbeddedEffect, idx: number) => (
                    <EffectBadge
                      key={`inactive-${effect.label}-${idx}`}
                      label={effect.label}
                      changes={effect.changes}
                      disabled
                      origin={effect.origin}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

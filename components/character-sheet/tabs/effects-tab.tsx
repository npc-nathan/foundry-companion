'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
import type { FoundryEffect } from '@/components/character-sheet/types';
import type { SheetTabProps } from './types';

export function EffectsTab({ data }: SheetTabProps) {
  const { effects } = data;

  if (effects.length === 0) return null;

  return (
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
  );
}

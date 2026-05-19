'use client';

import type { ReactNode } from 'react';
import { Shield, Sword, Swords, Backpack, Zap, ScrollText, Sparkles } from 'lucide-react';
import { buildDamageFormula } from '@/components/character-sheet/types';
import type { FoundryItem } from '@/components/character-sheet/types';

export function itemIcon(type: string): ReactNode {
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

export function itemSubtitle(item: FoundryItem): string {
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

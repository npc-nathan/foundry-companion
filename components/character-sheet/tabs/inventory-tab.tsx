'use client';

import { Zap, Sword, Backpack, Swords, ScrollText, Sparkles } from 'lucide-react';
import { itemIcon, itemSubtitle } from '@/components/character-sheet/ui-helpers';
import { CollapsibleSection } from '@/components/character-sheet/ui/collapsible-section';
import type { FoundryItem } from '@/components/character-sheet/types';
import type { SheetTabProps } from './types';

function iconFromName(name: string): React.ReactNode {
  switch (name) {
    case 'Backpack':
      return <Backpack className="h-4 w-4" />;
    case 'Swords':
      return <Swords className="h-4 w-4" />;
    case 'ScrollText':
      return <ScrollText className="h-4 w-4" />;
    case 'Sparkles':
      return <Sparkles className="h-4 w-4" />;
    default:
      return <Sword className="h-4 w-4" />;
  }
}

function ItemGrid({
  items,
  setDetailItem,
}: {
  items: FoundryItem[];
  setDetailItem: (item: FoundryItem | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
      {items.map((item: FoundryItem) => (
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
  );
}

export function InventoryTab({ data, setDetailItem }: SheetTabProps) {
  const { consumables, itemSections, currency } = data;

  return (
    <div className="space-y-3">
      {/* Consumables */}
      {consumables.length > 0 && (
        <CollapsibleSection
          title="Consumables"
          count={consumables.length}
          icon={<Zap className="h-4 w-4 text-amber-400" />}
          defaultOpen={false}
        >
          <ItemGrid items={consumables} setDetailItem={setDetailItem} />
        </CollapsibleSection>
      )}

      {/* Grouped Items */}
      {itemSections.map((section) => (
        <CollapsibleSection
          key={section.label}
          title={section.label}
          count={section.items.length}
          icon={iconFromName(section.iconName)}
          defaultOpen={section.label === 'Gear' || section.label === 'Equipment'}
        >
          <ItemGrid items={section.items} setDetailItem={setDetailItem} />
        </CollapsibleSection>
      ))}

      {/* Currency */}
      <div className="rounded-lg border p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-sm">Currency</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {([
            { label: 'PP', value: currency.pp, color: 'text-indigo-300' },
            { label: 'GP', value: currency.gp, color: 'text-yellow-400' },
            { label: 'EP', value: currency.ep, color: 'text-cyan-300' },
            { label: 'SP', value: currency.sp, color: 'text-gray-300' },
            { label: 'CP', value: currency.cp, color: 'text-amber-600' },
          ] as const).map((c) => (
            <div
              key={c.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-muted/40"
            >
              <span className={`text-sm font-bold ${c.color}`}>{c.value}</span>
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
